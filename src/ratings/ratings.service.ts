import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertRatingDto } from './dto';

@Injectable()
export class RatingsService {
  constructor(private prisma: PrismaService) {}

  async upsertRating(
    sessionId: string,
    userId: string,
    raterId: string,
    dto: UpsertRatingDto,
  ) {
    // Verify session exists
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify attendance and status
    const attendance = await this.prisma.attendance.findUnique({
      where: {
        sessionId_userId: {
          sessionId,
          userId,
        },
      },
    });

    if (!attendance || attendance.status !== 'YES') {
      throw new NotFoundException(
        'User is not registered as present for this session',
      );
    }

    // Upsert rating
    const rating = await this.prisma.sessionRating.upsert({
      where: {
        sessionId_userId: {
          sessionId,
          userId,
        },
      },
      update: {
        score: dto.score,
        comment: dto.comment,
        raterId,
      },
      create: {
        sessionId,
        userId,
        raterId,
        score: dto.score,
        comment: dto.comment,
      },
      include: {
        rater: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
          },
        },
      },
    });

    return rating;
  }

  async getSessionRatings(sessionId: string) {
    // Verify session exists
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Get all ratings for the session
    const ratings = await this.prisma.sessionRating.findMany({
      where: { sessionId },
      include: {
        rater: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate statistics
    const count = ratings.length;
    const average =
      count > 0 ? ratings.reduce((sum, r) => sum + r.score, 0) / count : 0;

    // Calculate distribution
    const distribution: Record<number, number> = {};
    for (let i = 0; i <= 10; i++) {
      distribution[i] = 0;
    }
    ratings.forEach(r => {
      distribution[r.score]++;
    });

    return {
      ratings,
      stats: {
        average: Math.round(average * 10) / 10, // Round to 1 decimal
        count,
        distribution,
      },
    };
  }

  async getUserRatings(userId: string, from?: string, to?: string) {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Build where clause
    const where: any = { userId };

    if (from || to) {
      where.session = {};
      if (from) {
        where.session.date = {
          ...where.session.date,
          gte: new Date(from),
        };
      }
      if (to) {
        where.session.date = {
          ...where.session.date,
          lte: new Date(to),
        };
      }
    }

    // Get ratings
    const ratings = await this.prisma.sessionRating.findMany({
      where,
      include: {
        rater: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
          },
        },
        session: {
          select: {
            id: true,
            date: true,
            slot: true,
            site: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate average
    const count = ratings.length;
    const average =
      count > 0 ? ratings.reduce((sum, r) => sum + r.score, 0) / count : 0;

    return {
      average: Math.round(average * 10) / 10,
      count,
      ratings,
    };
  }

  async deleteRating(sessionId: string, userId: string) {
    // Verify the rating exists
    const rating = await this.prisma.sessionRating.findUnique({
      where: {
        sessionId_userId: {
          sessionId,
          userId,
        },
      },
    });

    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    // Delete the rating
    await this.prisma.sessionRating.delete({
      where: {
        sessionId_userId: {
          sessionId,
          userId,
        },
      },
    });

    return { message: 'Rating deleted successfully' };
  }
}
