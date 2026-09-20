import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toZonedTime } from 'date-fns-tz';
import { startOfMonth } from 'date-fns';
import {
  ParentDashboardResponseDto,
  ChildDashboardDto,
} from './dto/parent-dashboard-response.dto';

const TIMEZONE = 'Europe/Paris';

@Injectable()
export class ParentDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getChildrenDashboard(
    parentUserId: string,
    fromString?: string,
    toString?: string,
  ): Promise<ParentDashboardResponseDto> {
    const now = new Date();

    // Default period: from the start of the current month (Europe/Paris) to now
    const fromDate = fromString
      ? new Date(fromString)
      : startOfMonth(toZonedTime(now, TIMEZONE));
    const toDate = toString ? new Date(toString) : now;

    // "now" boundary used to split past/upcoming items is the min of `to` and the actual current time
    const nowBoundary = toDate < now ? toDate : now;

    // Fetch children linked to the connected parent
    const links = await this.prisma.parentChild.findMany({
      where: { parentUserId },
      select: {
        childUser: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            birthDate: true,
          },
        },
      },
      orderBy: {
        childUser: { lastname: 'asc' },
      },
    });

    const children: ChildDashboardDto[] = await Promise.all(
      links.map(link =>
        this.buildChildDashboard(link.childUser, fromDate, nowBoundary),
      ),
    );

    return {
      period: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        timezone: TIMEZONE,
      },
      children,
    };
  }

  private async buildChildDashboard(
    child: {
      id: string;
      firstname: string;
      lastname: string;
      birthDate: Date | null;
    },
    fromDate: Date,
    nowBoundary: Date,
  ): Promise<ChildDashboardDto> {
    const [
      completedSessionsCount,
      ratingsAgg,
      completedTransportsCount,
      nightsCount,
      completedTournamentsCount,
      upcomingTournamentsCount,
    ] = await Promise.all([
      // Completed training sessions: attended (YES), not canceled, in the past, within the period
      this.prisma.attendance.count({
        where: {
          userId: child.id,
          status: 'YES',
          session: {
            isCanceled: false,
            date: { gte: fromDate, lte: nowBoundary },
          },
        },
      }),

      // Average rating received during past training sessions within the period
      this.prisma.sessionRating.aggregate({
        where: {
          userId: child.id,
          session: {
            date: { gte: fromDate, lte: nowBoundary },
          },
        },
        _avg: { score: true },
        _count: { score: true },
      }),

      // Completed transports: confirmed bookings whose occurrence departure is in the past, within the period
      this.prisma.transportBooking.count({
        where: {
          userId: child.id,
          status: 'CONFIRMED',
          occurrence: {
            departureAt: { gte: fromDate, lte: nowBoundary },
          },
        },
      }),

      // Nights: non-canceled residence stays in the past, within the period
      this.prisma.residenceStay.count({
        where: {
          userId: child.id,
          status: { not: 'CANCELED' },
          date: { gte: fromDate, lte: nowBoundary },
        },
      }),

      // Tournaments completed: confirmed participation, tournament ended within the period (in the past)
      this.prisma.tournamentParticipant.count({
        where: {
          userId: child.id,
          status: 'CONFIRMED',
          tournament: {
            endsAt: { gte: fromDate, lte: nowBoundary },
          },
        },
      }),

      // Tournaments upcoming: confirmed participation, tournament starts after the boundary date
      this.prisma.tournamentParticipant.count({
        where: {
          userId: child.id,
          status: 'CONFIRMED',
          tournament: {
            startsAt: { gt: nowBoundary },
          },
        },
      }),
    ]);

    return {
      child: {
        id: child.id,
        firstname: child.firstname,
        lastname: child.lastname,
        birthDate: child.birthDate ? child.birthDate.toISOString() : null,
      },
      trainingSessions: {
        completedCount: completedSessionsCount,
      },
      ratings: {
        average: ratingsAgg._avg.score,
        count: ratingsAgg._count.score,
      },
      transports: {
        completedCount: completedTransportsCount,
      },
      residence: {
        nightsCount,
      },
      tournaments: {
        completedCount: completedTournamentsCount,
        upcomingCount: upcomingTournamentsCount,
      },
    };
  }
}
