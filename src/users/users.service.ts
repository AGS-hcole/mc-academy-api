import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateConsentsDto } from './dto/update-consents.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async updateMe(userId: string, dto: UpdateMeDto) {
    try {
      const data: any = {};

      // Only include defined fields
      if (dto.firstname !== undefined) data.firstname = dto.firstname;
      if (dto.lastname !== undefined) data.lastname = dto.lastname;
      if (dto.phone !== undefined) data.phone = dto.phone;
      if (dto.fftLicenseNumber !== undefined)
        data.fftLicenseNumber = dto.fftLicenseNumber;
      if (dto.currentRanking !== undefined)
        data.currentRanking = dto.currentRanking;
      if (dto.notifyEmail !== undefined) data.notifyEmail = dto.notifyEmail;
      if (dto.notifySMS !== undefined) data.notifySMS = dto.notifySMS;
      if (dto.notifyWhatsApp !== undefined)
        data.notifyWhatsApp = dto.notifyWhatsApp;

      // Normalize birthDate to midnight UTC if provided
      if (dto.birthDate !== undefined) {
        const date = new Date(dto.birthDate);
        data.birthDate = new Date(
          Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
        );
      }

      const user = await this.prisma.user.update({
        where: { id: userId },
        data,
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

      return user;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          error: 'Conflict',
          code: 'FFT_LICENSE_TAKEN',
          field: 'fftLicenseNumber',
          message: 'This FFT license number is already in use',
        });
      }
      throw new InternalServerErrorException('Failed to update user');
    }
  }

  async updateConsents(userId: string, dto: UpdateConsentsDto) {
    try {
      const data: any = {};

      // Privacy consent is required and must be true
      if (dto.privacyConsent === true) {
        data.privacyConsentAt = new Date();
      }

      // Photo consent: true -> set timestamp, false -> null, undefined -> no change
      if (dto.photoConsent !== undefined) {
        data.photoConsentAt = dto.photoConsent ? new Date() : null;
      }

      // Marketing consent: true -> set timestamp, false -> null, undefined -> no change
      if (dto.marketingConsent !== undefined) {
        data.marketingConsentAt = dto.marketingConsent ? new Date() : null;
      }

      await this.prisma.user.update({
        where: { id: userId },
        data,
      });

      return { ok: true };
    } catch (error) {
      throw new InternalServerErrorException('Failed to update consents');
    }
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          avatarData: file.buffer,
          avatarMime: file.mimetype,
        },
      });

      return { ok: true };
    } catch (error) {
      throw new InternalServerErrorException('Failed to upload avatar');
    }
  }

  async uploadBackground(userId: string, file: Express.Multer.File) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          backgroundData: file.buffer,
          backgroundMime: file.mimetype,
        },
      });

      return { ok: true };
    } catch (error) {
      throw new InternalServerErrorException('Failed to upload background');
    }
  }

  async getAvatar(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          avatarData: true,
          avatarMime: true,
        },
      });

      if (!user?.avatarData) {
        return null;
      }

      return {
        data: user.avatarData,
        mimeType: user.avatarMime,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get avatar');
    }
  }

  async getBackground(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          backgroundData: true,
          backgroundMime: true,
        },
      });

      if (!user?.backgroundData) {
        return null;
      }

      return {
        data: user.backgroundData,
        mimeType: user.backgroundMime,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get background');
    }
  }
}
