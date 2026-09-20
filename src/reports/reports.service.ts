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
  ResidenceQueryDto,
  ResidenceTimeseriesQueryDto,
  ResidenceListQueryDto,
  ResidenceSummaryDto,
  ResidenceTimeseriesDto,
  ResidenceListDto,
  TransportsQueryDto,
  TransportsTimeseriesQueryDto,
  TransportsListQueryDto,
  TransportsSummaryDto,
  TransportsTimeseriesDto,
  TransportsListDto,
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
    let selectedUser: {
      id: string;
      firstname: string;
      lastname: string;
    } | null = null;
    if (userId) {
      selectedUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, firstname: true, lastname: true },
      });
      if (!selectedUser) {
        throw new BadRequestException('User not found');
      }
    }

    // Build where clause for ratings
    const ratingsWhere: Prisma.SessionRatingWhereInput = {
      session: { date: { gte: fromDate, lt: toDate } },
      ...(userId ? { userId } : {}),
    };

    // Get all ratings with session and attendance data
    const ratings = await this.prisma.sessionRating.findMany({
      where: ratingsWhere,
      include: {
        session: {
          include: {
            attendances: {
              select: { userId: true, status: true, outOfContract: true },
            },
          },
        },
        user: { select: { id: true, firstname: true, lastname: true } },
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
    const filteredRatings =
      contractScope === 'all'
        ? validRatings
        : validRatings.filter(rating => {
            const attendance = rating.session.attendances.find(
              att => att.userId === rating.userId,
            );
            if (!attendance) return false;
            if (contractScope === 'contract') return !attendance.outOfContract;
            if (contractScope === 'noContract') return attendance.outOfContract;
            return true;
          });

    // Global aggregates
    const count = filteredRatings.length;
    const average =
      count > 0
        ? filteredRatings.reduce((s, r) => s + r.score, 0) / count
        : null;

    // Distribution 1..10
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
    for (const r of filteredRatings) {
      const key = String(r.score) as keyof RatingDistribution;
      if (distribution[key] !== undefined) distribution[key]++;
    }

    // Rated / unrated sessions (YES attendances only; respects user filter if any)
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
          select: { outOfContract: true, userId: true, status: true },
        },
      },
    });

    const filteredSessions =
      contractScope === 'all'
        ? allSessions
        : allSessions.filter(session => {
            const relevant = userId
              ? session.attendances.filter(
                  a => a.userId === userId && a.status === 'YES',
                )
              : session.attendances.filter(a => a.status === 'YES');
            if (contractScope === 'contract')
              return relevant.some(a => !a.outOfContract);
            if (contractScope === 'noContract')
              return relevant.some(a => a.outOfContract);
            return true;
          });

    const ratedSessionIds = new Set(filteredRatings.map(r => r.sessionId));
    const ratedSessions = ratedSessionIds.size;
    const totalSessions = filteredSessions.length;
    const unratedSessions = Math.max(0, totalSessions - ratedSessions);

    // Contract split (counts of ratings)
    let contractCount = 0;
    let nonContractCount = 0;
    for (const r of filteredRatings) {
      const att = r.session.attendances.find(a => a.userId === r.userId);
      if (!att) continue;
      if (att.outOfContract) nonContractCount++;
      else contractCount++;
    }

    // Base response
    const response: RatingsSummaryDto = {
      period: { from, to },
      scope: { userId, contractScope },
      global: { average, count, distribution, ratedSessions, unratedSessions },
      contractSplit: { contractCount, nonContractCount },
    };

    // ---------- NEW: build perUser even when userId is provided ----------
    if (userId) {
      // Les filteredRatings sont déjà filtrés pour cet utilisateur (si userId présent)
      const userCount = filteredRatings.length;
      const userAverage =
        userCount > 0
          ? filteredRatings.reduce((s, r) => s + r.score, 0) / userCount
          : 0;

      response.perUser = [
        {
          user: {
            id: selectedUser!.id,
            firstName: selectedUser!.firstname,
            lastName: selectedUser!.lastname,
            avatarUrl: undefined,
          },
          average: Math.round(userAverage * 10) / 10,
          count: userCount,
        },
      ];

      // On ne calcule PAS topUsers/bottomUsers en mode filtré (array vide ou undefined au choix)
      response.topUsers = [];
      response.bottomUsers = [];
    } else {
      // ---------- EXISTANT : calcul perUser + top/bottom quand pas de filtre user ----------
      const userRatingsMap = new Map<
        string,
        { ratings: typeof filteredRatings; user: any }
      >();
      for (const r of filteredRatings) {
        if (!userRatingsMap.has(r.userId)) {
          userRatingsMap.set(r.userId, { ratings: [], user: r.user });
        }
        userRatingsMap.get(r.userId)!.ratings.push(r);
      }

      const perUser = Array.from(userRatingsMap.entries())
        .map(([uid, data]) => {
          const userCount = data.ratings.length;
          const avg =
            data.ratings.reduce((s, rr) => s + rr.score, 0) / userCount;
          return {
            user: {
              id: uid,
              firstName: data.user.firstname,
              lastName: data.user.lastname,
              avatarUrl: undefined,
            },
            average: Math.round(avg * 10) / 10,
            count: userCount,
          };
        })
        .filter(u => u.count > 0);

      response.perUser = perUser;

      const eligible = perUser.filter(u => u.count >= 3);
      if (eligible.length > 0) {
        const byDesc = [...eligible].sort((a, b) => b.average - a.average);
        response.topUsers = byDesc.slice(0, 5).map(u => ({
          userId: u.user.id,
          average: u.average,
          count: u.count,
        }));

        const byAsc = [...eligible].sort((a, b) => a.average - b.average);
        response.bottomUsers = byAsc.slice(0, 5).map(u => ({
          userId: u.user.id,
          average: u.average,
          count: u.count,
        }));
      }
    }
    // ---------- END NEW ----------

    return response;
  }

  async getResidenceSummary(
    query: ResidenceQueryDto,
  ): Promise<ResidenceSummaryDto> {
    const { from, to, userId, manorId, statusScope = 'all' } = query;
    const { fromDate, toDate } = this.validateDateRange(from, to);
    await this.ensureUserExists(userId);

    const residenceStatusFilter =
      statusScope === 'planned'
        ? 'PLANNED'
        : statusScope === 'canceled'
          ? 'CANCELED'
          : undefined;

    const stays = await this.prisma.residenceStay.findMany({
      where: {
        date: { gte: fromDate, lt: toDate },
        ...(userId ? { userId } : {}),
        ...(manorId ? { manorId } : {}),
        ...(residenceStatusFilter ? { status: residenceStatusFilter } : {}),
      },
      select: {
        userId: true,
        status: true,
      },
    });

    const uniqueUsers = new Set(stays.map(stay => stay.userId));
    const canceled = stays.filter(stay => stay.status === 'CANCELED').length;
    const planned = stays.length - canceled;

    return {
      period: { from, to, timezone: this.TIMEZONE },
      totals: {
        nights: stays.length,
        planned,
        canceled,
        uniqueUsers: uniqueUsers.size,
      },
    };
  }

  async getResidenceTimeseries(
    query: ResidenceTimeseriesQueryDto,
  ): Promise<ResidenceTimeseriesDto> {
    const { from, to, userId, manorId, statusScope = 'all' } = query;
    const { fromDate, toDate } = this.validateDateRange(from, to);
    await this.ensureUserExists(userId);

    const residenceStatusFilter =
      statusScope === 'planned'
        ? 'PLANNED'
        : statusScope === 'canceled'
          ? 'CANCELED'
          : undefined;

    const stays = await this.prisma.residenceStay.findMany({
      where: {
        date: { gte: fromDate, lt: toDate },
        ...(userId ? { userId } : {}),
        ...(manorId ? { manorId } : {}),
        ...(residenceStatusFilter ? { status: residenceStatusFilter } : {}),
      },
      select: {
        date: true,
        status: true,
      },
    });

    const dailyData = new Map<
      string,
      { total: number; planned: number; canceled: number }
    >();

    for (const stay of stays) {
      const parisTime = toZonedTime(stay.date, this.TIMEZONE);
      const dateKey = format(startOfDay(parisTime), 'yyyy-MM-dd');

      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, { total: 0, planned: 0, canceled: 0 });
      }

      const data = dailyData.get(dateKey)!;
      data.total++;
      if (stay.status === 'CANCELED') data.canceled++;
      else data.planned++;
    }

    const buckets: ResidenceTimeseriesDto['buckets'] = [];
    const parisFromDate = toZonedTime(fromDate, this.TIMEZONE);
    const parisToDate = toZonedTime(toDate, this.TIMEZONE);
    let current = startOfDay(parisFromDate);
    const end = startOfDay(parisToDate);

    while (current < end) {
      const dateStr = format(current, 'yyyy-MM-dd');
      const data = dailyData.get(dateStr);
      buckets.push({
        date: dateStr,
        total: data?.total || 0,
        planned: data?.planned || 0,
        canceled: data?.canceled || 0,
      });
      current = addDays(current, 1);
    }

    return { buckets };
  }

  async getResidenceList(
    query: ResidenceListQueryDto,
  ): Promise<ResidenceListDto> {
    const {
      from,
      to,
      userId,
      manorId,
      statusScope = 'all',
      page = 1,
      pageSize = 25,
      sort = 'date:desc',
    } = query;
    const { fromDate, toDate } = this.validateDateRange(from, to);
    await this.ensureUserExists(userId);
    const sortDirection = sort === 'date:asc' ? 'asc' : 'desc';
    const residenceStatusFilter =
      statusScope === 'planned'
        ? 'PLANNED'
        : statusScope === 'canceled'
          ? 'CANCELED'
          : undefined;

    const where: Prisma.ResidenceStayWhereInput = {
      date: { gte: fromDate, lt: toDate },
      ...(userId ? { userId } : {}),
      ...(manorId ? { manorId } : {}),
      ...(residenceStatusFilter ? { status: residenceStatusFilter } : {}),
    };

    const [total, stays] = await Promise.all([
      this.prisma.residenceStay.count({ where }),
      this.prisma.residenceStay.findMany({
        where,
        include: {
          user: { select: { id: true, firstname: true, lastname: true } },
          manor: { select: { id: true, name: true } },
        },
        orderBy: { date: sortDirection },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: stays.map(stay => ({
        id: stay.id,
        date: stay.date.toISOString(),
        manor: stay.manor
          ? {
              id: stay.manor.id,
              name: stay.manor.name,
            }
          : null,
        user: stay.user,
        status: stay.status,
        overCapacity: stay.overCapacity,
        createdByAdmin: stay.createdByAdmin,
      })),
      total,
      page,
      pageSize,
    };
  }

  async getTransportsSummary(
    query: TransportsQueryDto,
  ): Promise<TransportsSummaryDto> {
    const { from, to, userId, templateId, statusScope = 'all' } = query;
    const { fromDate, toDate } = this.validateDateRange(from, to);
    await this.ensureUserExists(userId);
    const bookingStatusFilter =
      statusScope === 'confirmed'
        ? 'CONFIRMED'
        : statusScope === 'cancelled'
          ? 'CANCELLED'
          : undefined;

    const bookings = await this.prisma.transportBooking.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(bookingStatusFilter ? { status: bookingStatusFilter } : {}),
        occurrence: {
          departureAt: { gte: fromDate, lt: toDate },
          ...(templateId ? { templateId } : {}),
        },
      },
      select: {
        userId: true,
        occurrenceId: true,
        status: true,
      },
    });

    const uniqueUsers = new Set(bookings.map(booking => booking.userId));
    const uniqueOccurrences = new Set(
      bookings.map(booking => booking.occurrenceId),
    );
    const cancelled = bookings.filter(
      booking => booking.status === 'CANCELLED',
    ).length;
    const confirmed = bookings.length - cancelled;

    return {
      period: { from, to, timezone: this.TIMEZONE },
      totals: {
        bookings: bookings.length,
        confirmed,
        cancelled,
        uniqueUsers: uniqueUsers.size,
        uniqueOccurrences: uniqueOccurrences.size,
      },
    };
  }

  async getTransportsTimeseries(
    query: TransportsTimeseriesQueryDto,
  ): Promise<TransportsTimeseriesDto> {
    const { from, to, userId, templateId, statusScope = 'all' } = query;
    const { fromDate, toDate } = this.validateDateRange(from, to);
    await this.ensureUserExists(userId);
    const bookingStatusFilter =
      statusScope === 'confirmed'
        ? 'CONFIRMED'
        : statusScope === 'cancelled'
          ? 'CANCELLED'
          : undefined;

    const bookings = await this.prisma.transportBooking.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(bookingStatusFilter ? { status: bookingStatusFilter } : {}),
        occurrence: {
          departureAt: { gte: fromDate, lt: toDate },
          ...(templateId ? { templateId } : {}),
        },
      },
      select: {
        status: true,
        occurrence: { select: { departureAt: true } },
      },
    });

    const dailyData = new Map<
      string,
      { total: number; confirmed: number; cancelled: number }
    >();

    for (const booking of bookings) {
      const parisTime = toZonedTime(
        booking.occurrence.departureAt,
        this.TIMEZONE,
      );
      const dateKey = format(startOfDay(parisTime), 'yyyy-MM-dd');

      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, { total: 0, confirmed: 0, cancelled: 0 });
      }

      const data = dailyData.get(dateKey)!;
      data.total++;
      if (booking.status === 'CANCELLED') data.cancelled++;
      else data.confirmed++;
    }

    const buckets: TransportsTimeseriesDto['buckets'] = [];
    const parisFromDate = toZonedTime(fromDate, this.TIMEZONE);
    const parisToDate = toZonedTime(toDate, this.TIMEZONE);
    let current = startOfDay(parisFromDate);
    const end = startOfDay(parisToDate);

    while (current < end) {
      const dateStr = format(current, 'yyyy-MM-dd');
      const data = dailyData.get(dateStr);
      buckets.push({
        date: dateStr,
        total: data?.total || 0,
        confirmed: data?.confirmed || 0,
        cancelled: data?.cancelled || 0,
      });
      current = addDays(current, 1);
    }

    return { buckets };
  }

  async getTransportsList(
    query: TransportsListQueryDto,
  ): Promise<TransportsListDto> {
    const {
      from,
      to,
      userId,
      templateId,
      statusScope = 'all',
      page = 1,
      pageSize = 25,
      sort = 'date:desc',
    } = query;
    const { fromDate, toDate } = this.validateDateRange(from, to);
    await this.ensureUserExists(userId);
    const sortDirection = sort === 'date:asc' ? 'asc' : 'desc';
    const bookingStatusFilter =
      statusScope === 'confirmed'
        ? 'CONFIRMED'
        : statusScope === 'cancelled'
          ? 'CANCELLED'
          : undefined;

    const where: Prisma.TransportBookingWhereInput = {
      ...(userId ? { userId } : {}),
      ...(bookingStatusFilter ? { status: bookingStatusFilter } : {}),
      occurrence: {
        departureAt: { gte: fromDate, lt: toDate },
        ...(templateId ? { templateId } : {}),
      },
    };

    const [total, bookings] = await Promise.all([
      this.prisma.transportBooking.count({ where }),
      this.prisma.transportBooking.findMany({
        where,
        include: {
          user: { select: { id: true, firstname: true, lastname: true } },
          occurrence: {
            include: {
              template: {
                select: {
                  id: true,
                  name: true,
                  fromLabel: true,
                  toLabel: true,
                },
              },
            },
          },
        },
        orderBy: { occurrence: { departureAt: sortDirection } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: bookings.map(booking => ({
        id: booking.id,
        departureAt: booking.occurrence.departureAt.toISOString(),
        template: booking.occurrence.template
          ? {
              id: booking.occurrence.template.id,
              name: booking.occurrence.template.name,
              fromLabel: booking.occurrence.template.fromLabel,
              toLabel: booking.occurrence.template.toLabel,
            }
          : null,
        user: booking.user,
        status: booking.status,
        seats: booking.seats,
      })),
      total,
      page,
      pageSize,
    };
  }

  private validateDateRange(from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (fromDate >= toDate) {
      throw new BadRequestException('from date must be before to date');
    }
    return { fromDate, toDate };
  }

  private async ensureUserExists(userId?: string) {
    if (!userId) return;
    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!userExists) {
      throw new BadRequestException('User not found');
    }
  }
}
