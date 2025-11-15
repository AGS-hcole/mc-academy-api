import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateConsentsDto } from './dto/update-consents.dto';
import { SessionFeedQueryDto } from './dto/session-feed-query.dto';
import { SessionFeedResponseDto } from './dto/session-feed-response.dto';
import { SessionFeedItemDto } from './dto/session-feed-item.dto';
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

  async getUserSessionFeed(
    userId: string,
    query: SessionFeedQueryDto,
  ): Promise<SessionFeedResponseDto> {
    try {
      // Verify user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const { cursor, limit = 10, direction = 'past' } = query;
      const TAKE = Math.min(limit, 50);

      // Build where clause
      const where: Prisma.SessionWhereInput = {
        attendances: {
          some: {
            userId,
            status: 'YES',
          },
        },
      };

      // Filter past sessions if direction is 'past'
      if (direction === 'past') {
        where.date = { lt: new Date() };
      }

      // Fetch sessions with cursor-based pagination
      const sessions = await this.prisma.session.findMany({
        where,
        orderBy: [{ date: 'desc' }, { slot: 'desc' }],
        take: TAKE + 1, // +1 to check if there's a next page
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1, // Skip the cursor item
            }
          : {}),
        include: {
          site: {
            select: {
              id: true,
              name: true,
            },
          },
          attendances: {
            where: {
              status: 'YES',
            },
            select: {
              id: true,
              userId: true,
              status: true,
            },
          },
          ratings: {
            select: {
              userId: true,
              score: true,
            },
          },
        },
      });

      // Check if there's more data
      const hasMore = sessions.length > TAKE;
      const items = hasMore ? sessions.slice(0, TAKE) : sessions;
      const nextCursor = hasMore ? items[items.length - 1].id : null;

      // Transform sessions to feed items
      const feedItems: SessionFeedItemDto[] = items.map(session => {
        // Find user's attendance
        const userAttendance = session.attendances.find(
          att => att.userId === userId,
        );

        // Find user's rating (rating received by this user from admins)
        // Note: SessionRating.userId is the participant being rated, not the rater
        const userRating = session.ratings.find(r => r.userId === userId);

        // Calculate average rating
        const ratingsCount = session.ratings.length;
        const averageRating =
          ratingsCount > 0
            ? session.ratings.reduce((sum, r) => sum + r.score, 0) /
              ratingsCount
            : null;

        // Count participants (attendances with YES status)
        const participantsCount = session.attendances.length;

        return {
          sessionId: session.id,
          date: session.date.toISOString(),
          slot: session.slot,
          startTime: session.startTime?.toISOString(),
          endTime: session.endTime?.toISOString(),
          siteId: session.site.id,
          siteName: session.site.name,
          userStatus: userAttendance?.status || 'NO',
          userRating: userRating ? userRating.score : null,
          averageRating: averageRating
            ? Math.round(averageRating * 10) / 10
            : null,
          participantsCount,
        };
      });

      return {
        items: feedItems,
        nextCursor,
        hasMore,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get session feed');
    }
  }
}
