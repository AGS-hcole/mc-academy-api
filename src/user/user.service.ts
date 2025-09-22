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
      const expires = addHours(new Date(), 1);

      const user = await this.prisma.user.create({
        data: {
          firstname: dto.firstname,
          lastname: dto.lastname,
          email: dto.email,
          role: dto.role,
          password: hashedPassword,
          resetPasswordToken: resetToken,
          resetTokenExpires: expires,
        },
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          role: true,
          resetPasswordToken: true,
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
          createdAt: true,
          updatedAt: true,
        },
      });
      return users;
    } catch {
      throw new InternalServerErrorException();
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
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: { firstname: dto.firstname, lastname: dto.lastname },
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          role: true,
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
      fullname: user.fullname,
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
