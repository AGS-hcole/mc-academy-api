import { BadRequestException, Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from 'src/prisma/prisma.service';
import { ParentDashboardQueryDto, ParentDashboardResponseDto } from './dto';

const TIMEZONE = 'Europe/Paris';

@Injectable()
export class ParentDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getParentDashboard(
    parentUserId: string,
    query: ParentDashboardQueryDto,
  ): Promise<ParentDashboardResponseDto> {
    const parsedPeriod = this.parsePeriod(query);

    const childLinks = await this.prisma.parentChild.findMany({
      where: { parentUserId },
      select: {
        childUserId: true,
        child: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
      },
    });

    childLinks.sort((a, b) => {
      const lastnameCmp = a.child.lastname.localeCompare(b.child.lastname);
      if (lastnameCmp !== 0) return lastnameCmp;
      return a.child.firstname.localeCompare(b.child.firstname);
    });

    const childIds = childLinks.map(link => link.childUserId);

    if (childIds.length === 0) {
      return {
        period: {
          startDate: parsedPeriod.startDate,
          endDate: parsedPeriod.endDate,
          timezone: TIMEZONE,
        },
        generatedAt: new Date().toISOString(),
        children: [],
      };
    }

    const [
      sessionsDone,
      ratingsAvg,
      transportsDone,
      nightsDone,
      tournamentsDone,
      tournamentsUpcoming,
    ] = await Promise.all([
      this.prisma.attendance.groupBy({
        by: ['userId'],
        where: {
          userId: { in: childIds },
          status: 'YES',
          session: {
            isCanceled: false,
            date: {
              gte: parsedPeriod.startDayUtc,
              lte: parsedPeriod.endDayUtc,
              lt: parsedPeriod.todayStartUtc,
            },
          },
        },
        _count: { _all: true },
      }),
      this.prisma.sessionRating.groupBy({
        by: ['userId'],
        where: {
          userId: { in: childIds },
          session: {
            isCanceled: false,
            date: {
              gte: parsedPeriod.startDayUtc,
              lte: parsedPeriod.endDayUtc,
              lt: parsedPeriod.todayStartUtc,
            },
          },
        },
        _avg: { score: true },
      }),
      this.prisma.transportBooking.groupBy({
        by: ['userId'],
        where: {
          userId: { in: childIds },
          status: 'CONFIRMED',
          occurrence: {
            departureAt: {
              gte: parsedPeriod.startUtc,
              lt: parsedPeriod.pastDateTimeEndUtc,
            },
          },
        },
        _count: { _all: true },
      }),
      this.prisma.residenceStay.groupBy({
        by: ['userId'],
        where: {
          userId: { in: childIds },
          status: { not: 'CANCELED' },
          date: {
            gte: parsedPeriod.startDayUtc,
            lte: parsedPeriod.endDayUtc,
            lt: parsedPeriod.todayStartUtc,
          },
        },
        _count: { _all: true },
      }),
      this.prisma.tournamentParticipant.groupBy({
        by: ['userId'],
        where: {
          userId: { in: childIds },
          status: 'CONFIRMED',
          tournament: {
            endsAt: {
              gte: parsedPeriod.startUtc,
              lt: parsedPeriod.pastDateTimeEndUtc,
            },
          },
        },
        _count: { _all: true },
      }),
      this.prisma.tournamentParticipant.groupBy({
        by: ['userId'],
        where: {
          userId: { in: childIds },
          status: 'CONFIRMED',
          tournament: {
            startsAt: {
              gte: parsedPeriod.upcomingStartUtc,
              lte: parsedPeriod.periodEndUtc,
            },
          },
        },
        _count: { _all: true },
      }),
    ]);

    const sessionsMap = new Map(
      sessionsDone.map(row => [row.userId, row._count._all]),
    );
    const ratingsMap = new Map(
      ratingsAvg.map(row => [row.userId, row._avg.score]),
    );
    const transportsMap = new Map(
      transportsDone.map(row => [row.userId, row._count._all]),
    );
    const nightsMap = new Map(
      nightsDone.map(row => [row.userId, row._count._all]),
    );
    const tournamentsDoneMap = new Map(
      tournamentsDone.map(row => [row.userId, row._count._all]),
    );
    const tournamentsUpcomingMap = new Map(
      tournamentsUpcoming.map(row => [row.userId, row._count._all]),
    );

    return {
      period: {
        startDate: parsedPeriod.startDate,
        endDate: parsedPeriod.endDate,
        timezone: TIMEZONE,
      },
      generatedAt: new Date().toISOString(),
      children: childLinks.map(link => ({
        child: link.child,
        metrics: {
          trainingSessionsDone: sessionsMap.get(link.childUserId) ?? 0,
          averageTrainingRating: ratingsMap.get(link.childUserId) ?? null,
          transportsDone: transportsMap.get(link.childUserId) ?? 0,
          residenceNightsDone: nightsMap.get(link.childUserId) ?? 0,
          tournamentsDone: tournamentsDoneMap.get(link.childUserId) ?? 0,
          tournamentsUpcoming:
            tournamentsUpcomingMap.get(link.childUserId) ?? 0,
        },
      })),
    };
  }

  private parsePeriod(query: ParentDashboardQueryDto) {
    const now = DateTime.now().setZone(TIMEZONE);

    let start: DateTime;
    let end: DateTime;

    if (query.startDate || query.endDate) {
      if (!query.startDate || !query.endDate) {
        throw new BadRequestException(
          'startDate and endDate must be provided together',
        );
      }

      start = this.parseLocalDay(query.startDate, 'startDate').startOf('day');
      end = this.parseLocalDay(query.endDate, 'endDate').startOf('day');
    } else if (query.from || query.to) {
      if (!query.from || !query.to) {
        throw new BadRequestException('from and to must be provided together');
      }

      start = DateTime.fromISO(query.from, { zone: 'utc' })
        .setZone(TIMEZONE)
        .startOf('day');
      end = DateTime.fromISO(query.to, { zone: 'utc' })
        .setZone(TIMEZONE)
        .startOf('day');
    } else {
      start = now.minus({ days: 30 }).startOf('day');
      end = now.startOf('day');
    }

    if (!start.isValid || !end.isValid) {
      throw new BadRequestException('Invalid period format');
    }

    if (start > end) {
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    }

    const todayStart = now.startOf('day');
    const startUtc = start.toUTC().toJSDate();
    const nowUtc = now.toUTC().toJSDate();
    const endExclusiveUtc = end.plus({ days: 1 }).toUTC().toJSDate();

    return {
      startDate: start.toFormat('yyyy-MM-dd'),
      endDate: end.toFormat('yyyy-MM-dd'),
      nowUtc,
      periodEndUtc: end.endOf('day').toUTC().toJSDate(),
      todayStartUtc: todayStart.toUTC().toJSDate(),
      startDayUtc: startUtc,
      endDayUtc: end.toUTC().toJSDate(),
      startUtc,
      upcomingStartUtc: startUtc > nowUtc ? startUtc : nowUtc,
      pastDateTimeEndUtc: endExclusiveUtc < nowUtc ? endExclusiveUtc : nowUtc,
      endExclusiveUtc,
    };
  }

  private parseLocalDay(value: string, fieldName: string): DateTime {
    const parsed = DateTime.fromFormat(value, 'yyyy-MM-dd', {
      zone: TIMEZONE,
      setZone: true,
    });

    if (!parsed.isValid || parsed.toFormat('yyyy-MM-dd') !== value) {
      throw new BadRequestException(
        `${fieldName} must be a valid calendar date in YYYY-MM-DD format`,
      );
    }

    return parsed;
  }
}
