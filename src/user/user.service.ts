import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from './entities/user.entity';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import { addHours } from 'date-fns';
import { EmailService } from 'src/common/email.service';

@Injectable()
export class UserService {
  /**
   * Constructor
   */
  constructor(
    private prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------
  async create(dto: CreateUserDto) {
    // Properly format the email address
    dto.email = dto.email.toLowerCase().trim();

    try {
      // Hash a random password
      const hashedPassword = await bcrypt.hash(
        this.generateRandomPassword(),
        10,
      );

      // Generate a random UID as reset Token
      const resetToken = uuidv4();
      // Make the token expire within one hour
      const expires = addHours(new Date(), 24);

      // Build the data object dynamically
      const userData: any = {
        firstname: dto.firstname.trim(),
        lastname: dto.lastname.trim(),
        email: dto.email.trim().toLowerCase(),
        role: dto.role,
        password: hashedPassword,
        resetPasswordToken: resetToken,
        resetTokenExpires: expires,
      };

      // Add optional fields if provided
      if (dto.phone !== undefined && dto.phone !== null)
        userData.phone = dto.phone.trim();
      if (dto.birthDate !== undefined && dto.birthDate !== null)
        userData.birthDate = new Date(dto.birthDate.trim());
      if (dto.fftLicenseNumber !== undefined && dto.fftLicenseNumber !== null)
        userData.fftLicenseNumber = dto.fftLicenseNumber.trim();
      if (dto.currentRanking !== undefined)
        userData.currentRanking = dto.currentRanking;
      if (dto.formula !== undefined) userData.formula = dto.formula;

      const user = await this.prisma.user.create({
        data: userData,
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          role: true,
          phone: true,
          birthDate: true,
          fftLicenseNumber: true,
          currentRanking: true,
          avatarData: true,
          avatarMime: true,
          backgroundData: true,
          backgroundMime: true,
          formula: true,
          notifyEmail: true,
          notifySMS: true,
          notifyWhatsApp: true,
          resetPasswordToken: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await this.sendWelcomeEmailToUser(user);

      return user;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll() {
    try {
      const users = await this.prisma.user.findMany({
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          role: true,
          phone: true,
          birthDate: true,
          fftLicenseNumber: true,
          currentRanking: true,
          formula: true,
          privacyConsentAt: true,
          photoConsentAt: true,
          marketingConsentAt: true,
          notifyEmail: true,
          notifySMS: true,
          notifyWhatsApp: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return users;
    } catch {
      throw new InternalServerErrorException();
    }
  }

  async lookup(params?: {
    role?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { role, search, page = 1, pageSize = 20 } = params || {};

    try {
      const where: any = {};

      // Filter by role if provided
      if (role) {
        where.role = role;
      }

      // Search by name or email
      if (search && search.trim()) {
        where.OR = [
          { firstname: { contains: search, mode: 'insensitive' } },
          { lastname: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            role: true,
          },
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: [{ lastname: 'asc' }, { firstname: 'asc' }],
        }),
        this.prisma.user.count({ where }),
      ]);

      return {
        items: users,
        total,
        page,
        pageSize,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getById(id: string) {
    try {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          role: true,
          phone: true,
          birthDate: true,
          fftLicenseNumber: true,
          currentRanking: true,
          formula: true,
          privacyConsentAt: true,
          photoConsentAt: true,
          marketingConsentAt: true,
          notifyEmail: true,
          notifySMS: true,
          notifyWhatsApp: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    } catch {
      throw new InternalServerErrorException();
    }
  }

  async update(id: string, dto: UpdateUserDto) {
    try {
      // Build the update data object dynamically, only including provided fields
      const updateData: any = {};

      if (dto.firstname !== undefined && dto.firstname !== null)
        updateData.firstname = dto.firstname.trim();
      if (dto.lastname !== undefined && dto.lastname !== null)
        updateData.lastname = dto.lastname.trim();
      if (dto.email !== undefined && dto.email !== null)
        updateData.email = dto.email.toLowerCase().trim();
      if (dto.role !== undefined && dto.role !== null)
        updateData.role = dto.role;
      if (dto.phone !== undefined && dto.phone !== null)
        updateData.phone = dto.phone.trim();
      if (dto.birthDate !== undefined && dto.birthDate !== null)
        updateData.birthDate = new Date(dto.birthDate.trim());
      if (dto.fftLicenseNumber !== undefined && dto.fftLicenseNumber !== null)
        updateData.fftLicenseNumber = dto.fftLicenseNumber.trim();
      if (dto.currentRanking !== undefined)
        updateData.currentRanking = dto.currentRanking;
      if (dto.formula !== undefined) updateData.formula = dto.formula;
      if (dto.privacyConsentAt !== undefined)
        updateData.privacyConsentAt = new Date(dto.privacyConsentAt);
      if (dto.photoConsentAt !== undefined)
        updateData.photoConsentAt = new Date(dto.photoConsentAt);
      if (dto.marketingConsentAt !== undefined)
        updateData.marketingConsentAt = new Date(dto.marketingConsentAt);
      if (dto.notifyEmail !== undefined)
        updateData.notifyEmail = dto.notifyEmail;
      if (dto.notifySMS !== undefined) updateData.notifySMS = dto.notifySMS;
      if (dto.notifyWhatsApp !== undefined)
        updateData.notifyWhatsApp = dto.notifyWhatsApp;

      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          role: true,
          phone: true,
          birthDate: true,
          fftLicenseNumber: true,
          currentRanking: true,
          formula: true,
          privacyConsentAt: true,
          photoConsentAt: true,
          marketingConsentAt: true,
          notifyEmail: true,
          notifySMS: true,
          notifyWhatsApp: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return updatedUser;
    } catch {
      throw new InternalServerErrorException();
    }
  }

  async delete(id: string, currentUser: User) {
    if (id !== currentUser.id && currentUser.role !== 'admin')
      throw new UnauthorizedException();

    try {
      await this.prisma.user.delete({
        where: { id },
        select: {
          id: true,
          email: true,
          firstname: true,
          lastname: true,
        },
      });

      return { message: "L'utilisateur a été supprimé avec succès." };
    } catch {
      throw new InternalServerErrorException();
    }
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Private methods
  // -----------------------------------------------------------------------------------------------------
  private generateRandomPassword(length: number = 12): string {
    // Set the allowed chars for the password
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_-+=<>?';

    // Calculate how many times to iterate over as byte
    const byteLength = Math.ceil((length * 6) / 8); // 6 bits par caractère, converti en octets

    // Generate random octets
    const randomBuffer = randomBytes(byteLength);

    // Convert bytes to a string using characters defined in charset
    let password = '';

    // Iterate to build up the password string
    for (let i = 0; i < length; i++) {
      password += charset[randomBuffer[i] % charset.length];
    }

    return password;
  }

  private async sendWelcomeEmailToUser(user: any) {
    const replacements = {
      fullname: `${user.firstname} ${user.lastname}`,
      url: `${process.env.FRONT_URL}/reset-password?token=${user.resetPasswordToken}`,
      year: new Date().getFullYear().toString(),
    };

    await this.emailService.sendTemplateEmail(
      user.email,
      '',
      "[MyCenter Academy] Votre compte vient d'être créé !",
      'welcome-email',
      replacements,
    );
  }
}
