import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  SessionsQueryDto,
  SessionsTimeseriesQueryDto,
  SessionsListQueryDto,
  SessionsSummaryDto,
  SessionsTimeseriesDto,
  SessionsListDto,
} from './dto';

@Injectable()
export class ReportsService {
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

    // Build base where clause
    const baseWhere = this.buildSessionWhereClause(fromDate, toDate, userId, contractScope);

    // Execute parallel queries for counts
    const [
      totalSessions,
      underContractCount,
      offContractCount,
      uniqueUsersData,
    ] = await Promise.all([
      // Total sessions count
      this.prisma.session.count({ where: baseWhere }),
      
      // Under contract sessions - sessions where all attendances have outOfContract = false
      this.countSessionsByContractType(fromDate, toDate, userId, false),
      
      // Off contract sessions - sessions where any attendance has outOfContract = true
      this.countSessionsByContractType(fromDate, toDate, userId, true),
      
      // Unique users with attendance
      this.prisma.attendance.findMany({
        where: {
          session: {
            startTime: { gte: fromDate, lt: toDate },
            ...(userId ? { attendances: { some: { userId } } } : {}),
          },
        },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);

    return {
      period: {
        from,
        to,
        timezone: 'Europe/Paris',
      },
      totals: {
        sessions: totalSessions,
        underContract: underContractCount,
        offContract: offContractCount,
        uniqueUsers: uniqueUsersData.length,
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

    // Build SQL query for time series
    // We use raw SQL for better performance with time zone conversions and grouping
    const userJoin = userId ? `JOIN "Attendance" a ON a."sessionId" = s."id" AND a."userId" = $3` : '';
    const contractFilter = this.buildContractFilter(contractScope);
    
    const params: any[] = [fromDate, toDate];
    if (userId) {
      params.push(userId);
    }

    const query_sql = `
      WITH date_buckets AS (
        SELECT 
          (date_trunc('day', s."startTime" AT TIME ZONE 'Europe/Paris')) AS day,
          s.id,
          EXISTS(
            SELECT 1 FROM "Attendance" att 
            WHERE att."sessionId" = s.id AND att."outOfContract" = true
          ) as has_off_contract
        FROM "Session" s
        ${userJoin}
        WHERE s."startTime" >= $1 AND s."startTime" < $2
          ${contractFilter}
        ${userId ? 'GROUP BY s.id, s."startTime"' : ''}
      ),
      aggregated AS (
        SELECT 
          day,
          COUNT(*) as total,
          SUM(CASE WHEN has_off_contract = false THEN 1 ELSE 0 END) as under,
          SUM(CASE WHEN has_off_contract = true THEN 1 ELSE 0 END) as off
        FROM date_buckets
        GROUP BY day
      )
      SELECT 
        to_char(day AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD') as date,
        total::int,
        under::int as "underContract",
        off::int as "offContract"
      FROM aggregated
      ORDER BY day ASC
    `;

    const rows = await this.prisma.$queryRawUnsafe<
      Array<{ date: string; total: number; underContract: number; offContract: number }>
    >(query_sql, ...params);

    // Fill gaps with zero-value buckets
    const buckets = this.fillDateGaps(rows, fromDate, toDate);

    return { buckets };
  }

  /**
   * Get paginated list of sessions
   */
  async getSessionsList(
    query: SessionsListQueryDto,
  ): Promise<SessionsListDto> {
    const { from, to, userId, contractScope, page = 1, pageSize = 25, sort = 'date:desc' } = query;

    // Validate date range
    const fromDate = new Date(from);
    const toDate = new Date(to);
    
    if (fromDate >= toDate) {
      throw new BadRequestException('from date must be before to date');
    }

    // Parse sort parameter
    const [sortField, sortDir] = sort.split(':');
    const orderBy = sortField === 'date' 
      ? { startTime: sortDir === 'asc' ? 'asc' as const : 'desc' as const }
      : { startTime: 'desc' as const };

    // Build where clause
    const where = this.buildSessionWhereClause(fromDate, toDate, userId, contractScope);

    // Execute queries in parallel
    const [sessions, total] = await Promise.all([
      this.prisma.session.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          site: { select: { name: true } },
          _count: { select: { attendances: true } },
          attendances: { select: { outOfContract: true } },
        },
      }),
      this.prisma.session.count({ where }),
    ]);

    // Map to response format
    const items = sessions.map((session) => {
      // Determine contract type based on attendances
      const hasOffContract = session.attendances.some(a => a.outOfContract);
      const contractType = hasOffContract ? 'OFF' : 'UNDER';

      // Format title - use site name and slot info
      const title = `${session.site.name} - ${session.slot}`;
      
      // Format status
      const status = session.isCanceled ? 'CANCELLED' : 
                     session.isPublished ? 'PUBLISHED' : 'SCHEDULED';

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
    contractScope?: string,
  ): Prisma.SessionWhereInput {
    const where: Prisma.SessionWhereInput = {
      startTime: { gte: fromDate, lt: toDate },
    };

    // Add user filter
    if (userId) {
      where.attendances = { some: { userId } };
    }

    // Contract scope filtering is complex - we'll handle it differently
    // since it's based on attendance.outOfContract, not session level
    // We'll apply it in queries where needed

    return where;
  }

  /**
   * Helper: Build contract filter for SQL
   */
  private buildContractFilter(contractScope?: string): string {
    if (contractScope === 'under') {
      return `AND NOT EXISTS(SELECT 1 FROM "Attendance" att WHERE att."sessionId" = s.id AND att."outOfContract" = true)`;
    } else if (contractScope === 'off') {
      return `AND EXISTS(SELECT 1 FROM "Attendance" att WHERE att."sessionId" = s.id AND att."outOfContract" = true)`;
    }
    return '';
  }

  /**
   * Helper: Count sessions by contract type
   */
  private async countSessionsByContractType(
    fromDate: Date,
    toDate: Date,
    userId: string | undefined,
    isOffContract: boolean,
  ): Promise<number> {
    const userJoin = userId ? `JOIN "Attendance" ua ON ua."sessionId" = s.id AND ua."userId" = $3` : '';
    const params: any[] = [fromDate, toDate];
    if (userId) {
      params.push(userId);
    }

    const condition = isOffContract
      ? `EXISTS(SELECT 1 FROM "Attendance" att WHERE att."sessionId" = s.id AND att."outOfContract" = true)`
      : `NOT EXISTS(SELECT 1 FROM "Attendance" att WHERE att."sessionId" = s.id AND att."outOfContract" = true)`;

    const query_sql = `
      SELECT COUNT(DISTINCT s.id)::int as count
      FROM "Session" s
      ${userJoin}
      WHERE s."startTime" >= $1 AND s."startTime" < $2
        AND ${condition}
    `;

    const result = await this.prisma.$queryRawUnsafe<Array<{ count: number }>>(
      query_sql,
      ...params,
    );

    return result[0]?.count || 0;
  }

  /**
   * Helper: Fill gaps in date buckets with zero values
   */
  private fillDateGaps(
    rows: Array<{ date: string; total: number; underContract: number; offContract: number }>,
    fromDate: Date,
    toDate: Date,
  ): Array<{ date: string; total: number; underContract: number; offContract: number }> {
    const result: Array<{ date: string; total: number; underContract: number; offContract: number }> = [];
    const dataMap = new Map(rows.map(r => [r.date, r]));

    // Convert to Paris timezone for bucketing
    const current = new Date(fromDate);
    const end = new Date(toDate);

    while (current < end) {
      const dateStr = current.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      if (dataMap.has(dateStr)) {
        result.push(dataMap.get(dateStr)!);
      } else {
        result.push({
          date: dateStr,
          total: 0,
          underContract: 0,
          offContract: 0,
        });
      }

      // Move to next day
      current.setDate(current.getDate() + 1);
    }

    return result;
  }
}
