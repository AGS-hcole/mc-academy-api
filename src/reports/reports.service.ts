import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { toZonedTime } from 'date-fns-tz';
import { startOfDay, addDays, format } from 'date-fns';
import {
  SessionsQueryDto,
  SessionsTimeseriesQueryDto,
  SessionsListQueryDto,
  SessionsSummaryDto,
  SessionsTimeseriesDto,
  SessionsListDto,
  RatingsQueryDto,
  RatingsSummaryDto,
  RatingDistribution,
} from './dto';

@Injectable()
export class ReportsService {
  private readonly TIMEZONE = 'Europe/Paris';

  constructor(private prisma: PrismaService) {}

  /**
   * Get summary statistics for sessions within a date range
   */
  async getSessionsSummary(
    query: SessionsQueryDto,
  ): Promise<SessionsSummaryDto> {
    const { from, to, userId, contractScope } = query;

    // Validate date range
    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (fromDate >= toDate) {
      throw new BadRequestException('from date must be before to date');
    }

    // Validate user exists if provided
    if (userId) {
      const userExists = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!userExists) {
        throw new BadRequestException('User not found');
      }
    }

    // Build base where clause for sessions
    const baseWhere = this.buildSessionWhereClause(fromDate, toDate, userId);

    // Get all sessions with their attendances
    const sessions = await this.prisma.session.findMany({
      where: baseWhere,
      include: {
        attendances: {
          select: {
            userId: true,
            outOfContract: true,
          },
        },
      },
    });

    // Process sessions to categorize and count
    let underContractCount = 0;
    let offContractCount = 0;
    const uniqueUserIds = new Set<string>();

    for (const session of sessions) {
      // Collect unique user IDs
      session.attendances.forEach(att => uniqueUserIds.add(att.userId));

      // Determine if session is under or off contract
      const hasOffContract = session.attendances.some(att => att.outOfContract);

      if (hasOffContract) {
        offContractCount++;
      } else {
        underContractCount++;
      }
    }

    // Apply contract scope filter to counts
    let totalSessions = sessions.length;
    if (contractScope === 'under') {
      totalSessions = underContractCount;
      offContractCount = 0;
    } else if (contractScope === 'off') {
      totalSessions = offContractCount;
      underContractCount = 0;
    }

    return {
      period: {
        from,
        to,
        timezone: this.TIMEZONE,
      },
      totals: {
        sessions: totalSessions,
        underContract: underContractCount,
        offContract: offContractCount,
        uniqueUsers: uniqueUserIds.size,
      },
    };
  }

  /**
   * Get time series data bucketed by day
   */
  async getSessionsTimeseries(
    query: SessionsTimeseriesQueryDto,
  ): Promise<SessionsTimeseriesDto> {
    const { from, to, userId, contractScope } = query;

    // Validate date range
    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (fromDate >= toDate) {
      throw new BadRequestException('from date must be before to date');
    }

    // Build where clause
    const where = this.buildSessionWhereClause(fromDate, toDate, userId);

    // Get all sessions with attendances
    const sessions = await this.prisma.session.findMany({
      where,
      select: {
        id: true,
        startTime: true,
        date: true,
        attendances: {
          select: {
            outOfContract: true,
          },
        },
      },
    });

    // Group sessions by day in Europe/Paris timezone
    const dailyData = new Map<
      string,
      { total: number; under: number; off: number }
    >();

    for (const session of sessions) {
      const sessionTime = session.startTime || session.date;
      // Convert to Paris timezone and get the date string
      const parisTime = toZonedTime(sessionTime, this.TIMEZONE);
      const dayStart = startOfDay(parisTime);
      const dateKey = format(dayStart, 'yyyy-MM-dd');

      // Determine contract type
      const hasOffContract = session.attendances.some(att => att.outOfContract);

      // Apply contract scope filter
      if (contractScope === 'under' && hasOffContract) continue;
      if (contractScope === 'off' && !hasOffContract) continue;

      // Update daily counts
      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, { total: 0, under: 0, off: 0 });
      }

      const data = dailyData.get(dateKey)!;
      data.total++;
      if (hasOffContract) {
        data.off++;
      } else {
        data.under++;
      }
    }

    // Fill gaps and create buckets array
    const buckets = this.fillDateGapsWithTimeZone(dailyData, fromDate, toDate);

    return { buckets };
  }

  /**
   * Get paginated list of sessions
   */
  async getSessionsList(query: SessionsListQueryDto): Promise<SessionsListDto> {
    const {
      from,
      to,
      userId,
      contractScope,
      page = 1,
      pageSize = 25,
      sort = 'date:desc',
    } = query;

    // Validate date range
    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (fromDate >= toDate) {
      throw new BadRequestException('from date must be before to date');
    }

    // Parse sort parameter
    const [sortField, sortDir] = sort.split(':');
    const orderBy =
      sortField === 'date'
        ? {
            startTime: sortDir === 'asc' ? ('asc' as const) : ('desc' as const),
          }
        : { startTime: 'desc' as const };

    // Build where clause
    const where = this.buildSessionWhereClause(fromDate, toDate, userId);

    // Get sessions with attendances for contract filtering
    const allSessions = await this.prisma.session.findMany({
      where,
      orderBy,
      include: {
        site: { select: { name: true } },
        attendances: { select: { outOfContract: true } },
        _count: { select: { attendances: true } },
      },
    });

    // Filter by contract scope if specified
    let filteredSessions = allSessions;
    if (contractScope && contractScope !== 'all') {
      filteredSessions = allSessions.filter(session => {
        const hasOffContract = session.attendances.some(
          att => att.outOfContract,
        );
        if (contractScope === 'under') {
          return !hasOffContract;
        } else if (contractScope === 'off') {
          return hasOffContract;
        }
        return true;
      });
    }

    // Apply pagination
    const total = filteredSessions.length;
    const paginatedSessions = filteredSessions.slice(
      (page - 1) * pageSize,
      page * pageSize,
    );

    // Map to response format
    const items = paginatedSessions.map(session => {
      // Determine contract type based on attendances
      const hasOffContract = session.attendances.some(a => a.outOfContract);
      const contractType = hasOffContract ? 'OFF' : 'UNDER';

      // Format title - use site name and slot info
      const title = `${session.site.name} - ${session.slot}`;

      // Format status
      const status = session.isCanceled
        ? 'CANCELLED'
        : session.isPublished
          ? 'PUBLISHED'
          : 'SCHEDULED';

      return {
        id: session.id,
        date: session.startTime?.toISOString() || session.date.toISOString(),
        title,
        contractType,
        attendeesCount: session._count.attendances,
        status,
      };
    });

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Helper: Build session where clause
   */
  private buildSessionWhereClause(
    fromDate: Date,
    toDate: Date,
    userId?: string,
  ): Prisma.SessionWhereInput {
    const where: Prisma.SessionWhereInput = {
      date: { gte: fromDate, lt: toDate },
    };

    // Add user filter
    if (userId) {
      where.attendances = { some: { userId } };
    }

    return where;
  }

  /**
   * Helper: Fill gaps in date buckets with zero values using timezone awareness
   */
  private fillDateGapsWithTimeZone(
    dailyData: Map<string, { total: number; under: number; off: number }>,
    fromDate: Date,
    toDate: Date,
  ): Array<{
    date: string;
    total: number;
    underContract: number;
    offContract: number;
  }> {
    const result: Array<{
      date: string;
      total: number;
      underContract: number;
      offContract: number;
    }> = [];

    // Convert UTC dates to Paris timezone
    const parisFromDate = toZonedTime(fromDate, this.TIMEZONE);
    const parisToDate = toZonedTime(toDate, this.TIMEZONE);

    // Get start of day in Paris timezone
    let current = startOfDay(parisFromDate);
    const end = startOfDay(parisToDate);

    while (current < end) {
      const dateStr = format(current, 'yyyy-MM-dd');

      const data = dailyData.get(dateStr);

      result.push({
        date: dateStr,
        total: data?.total || 0,
        underContract: data?.under || 0,
        offContract: data?.off || 0,
      });

      // Move to next day
      current = addDays(current, 1);
    }

    return result;
  }

  /**
   * Get ratings summary report
   */
  async getRatingsSummary(query: RatingsQueryDto): Promise<RatingsSummaryDto> {
    const { from, to, userId, contractScope = 'all' } = query;

    // Validate date range
    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (fromDate >= toDate) {
      throw new BadRequestException('from date must be before to date');
    }

    // Validate user exists if provided
    if (userId) {
      const userExists = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!userExists) {
        throw new BadRequestException('User not found');
      }
    }

    // Build where clause for ratings
    // Only consider ratings where attendance status is YES
    const ratingsWhere: any = {
      session: {
        date: { gte: fromDate, lt: toDate },
      },
      // Join with attendance to ensure status YES
    };

    // Add user filter if provided
    if (userId) {
      ratingsWhere.userId = userId;
    }

    // Get all ratings with session and attendance data
    const ratings = await this.prisma.sessionRating.findMany({
      where: ratingsWhere,
      include: {
        session: {
          include: {
            attendances: {
              select: {
                userId: true,
                status: true,
                outOfContract: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
          },
        },
      },
    });

    // Filter ratings to only those where the user has attendance status YES
    const validRatings = ratings.filter(rating => {
      const attendance = rating.session.attendances.find(
        att => att.userId === rating.userId,
      );
      return attendance && attendance.status === 'YES';
    });

    // Apply contract scope filter
    let filteredRatings = validRatings;
    if (contractScope !== 'all') {
      filteredRatings = validRatings.filter(rating => {
        const attendance = rating.session.attendances.find(
          att => att.userId === rating.userId,
        );
        if (contractScope === 'contract') {
          return attendance && !attendance.outOfContract;
        } else if (contractScope === 'noContract') {
          return attendance && attendance.outOfContract;
        }
        return true;
      });
    }

    // Calculate global aggregates
    const count = filteredRatings.length;
    const average =
      count > 0
        ? filteredRatings.reduce((sum, r) => sum + r.score, 0) / count
        : null;

    // Calculate distribution (1-10 scale)
    const distribution: RatingDistribution = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
      '6': 0,
      '7': 0,
      '8': 0,
      '9': 0,
      '10': 0,
    };

    for (const rating of filteredRatings) {
      const score = rating.score.toString() as keyof RatingDistribution;
      if (score in distribution) {
        distribution[score]++;
      }
    }

    // Calculate ratedSessions and unratedSessions
    const ratedSessionIds = new Set(filteredRatings.map(r => r.sessionId));
    const ratedSessions = ratedSessionIds.size;

    // Get total sessions in range with attendances status YES
    const sessionsWhere: Prisma.SessionWhereInput = {
      date: { gte: fromDate, lt: toDate },
      attendances: {
        some: {
          status: 'YES',
          ...(userId ? { userId } : {}),
        },
      },
    };

    const allSessions = await this.prisma.session.findMany({
      where: sessionsWhere,
      select: {
        id: true,
        attendances: {
          select: {
            outOfContract: true,
            userId: true,
            status: true,
          },
        },
      },
    });

    // Apply contract scope filter to total sessions count
    let filteredSessions = allSessions;
    if (contractScope !== 'all') {
      filteredSessions = allSessions.filter(session => {
        const relevantAttendances = userId
          ? session.attendances.filter(
              att => att.userId === userId && att.status === 'YES',
            )
          : session.attendances.filter(att => att.status === 'YES');

        if (contractScope === 'contract') {
          return relevantAttendances.some(att => !att.outOfContract);
        } else if (contractScope === 'noContract') {
          return relevantAttendances.some(att => att.outOfContract);
        }
        return true;
      });
    }

    const totalSessions = filteredSessions.length;
    const unratedSessions = Math.max(0, totalSessions - ratedSessions);

    // Calculate contract split
    let contractCount = 0;
    let nonContractCount = 0;

    for (const rating of filteredRatings) {
      const attendance = rating.session.attendances.find(
        att => att.userId === rating.userId,
      );
      if (attendance) {
        if (attendance.outOfContract) {
          nonContractCount++;
        } else {
          contractCount++;
        }
      }
    }

    // Build response
    const response: RatingsSummaryDto = {
      period: { from, to },
      scope: { userId, contractScope },
      global: {
        average,
        count,
        distribution,
        ratedSessions,
        unratedSessions,
      },
      contractSplit: {
        contractCount,
        nonContractCount,
      },
    };

    // Calculate per-user aggregates if userId not specified
    if (!userId) {
      // Group ratings by user
      const userRatingsMap = new Map<
        string,
        { ratings: typeof filteredRatings; user: any }
      >();

      for (const rating of filteredRatings) {
        if (!userRatingsMap.has(rating.userId)) {
          userRatingsMap.set(rating.userId, {
            ratings: [],
            user: rating.user,
          });
        }
        userRatingsMap.get(rating.userId)!.ratings.push(rating);
      }

      // Calculate per-user stats
      const perUser = Array.from(userRatingsMap.entries())
        .map(([userId, data]) => {
          const userCount = data.ratings.length;
          const userAverage =
            data.ratings.reduce((sum, r) => sum + r.score, 0) / userCount;

          return {
            user: {
              id: userId,
              firstName: data.user.firstname,
              lastName: data.user.lastname,
              avatarUrl: undefined, // Not stored as URL in DB
            },
            average: Math.round(userAverage * 10) / 10,
            count: userCount,
          };
        })
        .filter(u => u.count > 0);

      response.perUser = perUser;

      // Calculate top 5 and bottom 5 users (min count = 3)
      const eligibleUsers = perUser.filter(u => u.count >= 3);

      if (eligibleUsers.length > 0) {
        // Sort by average descending for top users
        const sortedByAvgDesc = [...eligibleUsers].sort(
          (a, b) => b.average - a.average,
        );
        response.topUsers = sortedByAvgDesc.slice(0, 5).map(u => ({
          userId: u.user.id,
          average: u.average,
          count: u.count,
        }));

        // Sort by average ascending for bottom users
        const sortedByAvgAsc = [...eligibleUsers].sort(
          (a, b) => a.average - b.average,
        );
        response.bottomUsers = sortedByAvgAsc.slice(0, 5).map(u => ({
          userId: u.user.id,
          average: u.average,
          count: u.count,
        }));
      }
    }

    return response;
  }
}
