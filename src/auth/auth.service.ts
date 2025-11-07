import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { addHours } from 'date-fns';
import { EmailService } from 'src/common/email.service';

@Injectable()
export class AuthService {
  /**
   * Constructor
   */
  constructor(
    private prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Get current user with mustOnboard flag
   */
  async getMe(userId: string) {
    try {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          firstname: true,
          lastname: true,
          phone: true,
          birthDate: true,
          fftLicenseNumber: true,
          currentRanking: true,
          formula: true,
          notifyEmail: true,
          notifySMS: true,
          notifyWhatsApp: true,
          privacyConsentAt: true,
          photoConsentAt: true,
          marketingConsentAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Compute mustOnboard flag
      const mustOnboard =
        !user.privacyConsentAt || !user.firstname || !user.lastname;

      return {
        user,
        mustOnboard,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid user');
    }
  }

  /**
   * Authenticates a user by their email and password.
   *
   * @param email - The email of the user attempting to sign in.
   * @param password - The password of the user attempting to sign in.
   * @returns A promise that resolves to an object containing the authenticated user, access token, and refresh token.
   * @throws {BadRequestException} If the email is not found or the password does not match.
   */
  async signIn(email: string, password: string): Promise<any> {
    try {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { email: email.trim().toLowerCase() },
      });

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        throw new BadRequestException('Identifiants invalides.');
      }

      return await this.generateAuthTokens(user);
    } catch (error) {
      throw new BadRequestException('Identifiants invalides.');
    }
  }

  /**
   * Refreshes the authentication tokens using the provided old refresh token.
   *
   * @param {string} oldRefreshToken - The old refresh token to be verified and used for generating new tokens.
   * @returns {Promise<any>} A promise that resolves to the new authentication tokens.
   * @throws {UnauthorizedException} If the old refresh token is invalid or an error occurs during token generation.
   */
  async refreshToken(oldRefreshToken: string) {
    try {
      const payload = this.jwtService.verify(oldRefreshToken);

      const user = await this.prisma.user.findFirst({
        where: {
          id: payload.sub,
          refreshToken: oldRefreshToken,
        },
      });

      if (!user) {
        throw new UnauthorizedException('Token invalide');
      }

      return await this.generateAuthTokens(user);
    } catch (error) {
      throw new UnauthorizedException(
        'Une erreur est survenue durant la génération du refresh Token.',
      );
    }
  }

  /**
   * Generates authentication tokens (access and refresh tokens) for a given user.
   *
   * @param user - The user object for whom the tokens are being generated.
   * @returns An object containing the user (with the password removed), access token, and refresh token.
   *
   * @remarks
   * - The access token is generated using the user's ID.
   * - The refresh token is generated using the user's ID and email, and it expires based on the `JWT_REFRESH_EXP` environment variable.
   * - The refresh token is saved into the database associated with the user.
   * - The user's password is removed from the user object before returning the response.
   */
  private async generateAuthTokens(user: any) {
    // Generate access token
    const accessToken = this.jwtService.sign({ sub: user.id });

    // Generate refresh token
    const refreshToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { expiresIn: process.env.JWT_REFRESH_EXP },
    );

    // Save the refresh token into database
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    // Remove the password from the user class so we do not return in response
    delete user.password;
    delete user.refreshToken;
    delete user.avatarData;
    delete user.backgroundData;

    // Return the auth response
    return {
      user,
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
  }

  /**
   * Initiates the forgot password process for a user.
   *
   * This method performs the following steps:
   * 1. Checks if a user with the given email exists.
   * 2. If the user does not exist, the method returns silently to avoid revealing whether the email is associated with a user.
   * 3. Generates a random UID to be used as a reset token.
   * 4. Sets the token to expire in one hour.
   * 5. Updates the user record with the reset token and expiration time.
   * 6. Sends a reset password email to the user with the reset token.
   *
   * @param email - The email address of the user who has requested a password reset.
   * @returns void
   */
  async forgotPassword(email: string) {
    // Vérifier si l'utilisateur existe
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Return if the user is not found, we don't want to warn user the email does not match a real user email address
    if (!user) return;

    // Generate a random UID as reset Token
    const resetToken = uuidv4();
    // Make the token expire within one hour
    const expires = addHours(new Date(), 1);

    // Update the user with the resetToken and expire time
    await this.prisma.user.update({
      where: { email },
      data: {
        resetPasswordToken: resetToken,
        resetTokenExpires: expires,
      },
    });

    // Send the reset password email to the user
    await this.sendResetPasswordEmail(user, resetToken);

    return;
  }

  /**
   * Resets the user's password using a provided token and new password.
   *
   * @param {string} token - The reset password token to validate.
   * @param {string} newPassword - The new password to set for the user.
   * @returns {Promise<{ message: string }>} A message indicating the password reset status.
   * @throws {Error} If the token is invalid or has expired.
   */
  async resetPassword(token: string, newPassword: string) {
    // Check if the reset password token matches a user in database
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        // resetTokenExpires: {
        //   gte: new Date(),
        // },
      },
    });

    // Check if the user is found
    if (!user) {
      throw new Error('Le token est invalid ou a expiré.');
    }

    // Crypt the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the database with the new crypted password and reset token fields
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetTokenExpires: null,
      },
    });

    return { message: 'Le mot de passe a été réinitialisé avec succès !' };
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Private methods
  // -----------------------------------------------------------------------------------------------------
  /**
   * Sends a reset password email to the specified user.
   *
   * @param user - The user object containing user details.
   * @param token - The reset password token to be included in the email.
   * @returns A promise that resolves when the email has been sent.
   *
   * The email includes the user's full name, a reset password URL with the token,
   * and the current year. The email template used is 'reset-password-email'.
   */
  private async sendResetPasswordEmail(user: any, token: string) {
    const replacements = {
      fullname: user.fullname,
      url: `${process.env.FRONT_URL}/reset-password?token=${token}`,
      year: new Date().getFullYear().toString(),
    };

    await this.emailService.sendTemplateEmail(
      user.email,
      '',
      '[MC Academy] Réinitialisation du mot de passe',
      'reset-password',
      replacements,
    );
  }
}
