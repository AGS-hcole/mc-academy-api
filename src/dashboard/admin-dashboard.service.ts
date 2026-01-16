import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { format } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import {
  AdminDashboardResponseDto,
  SessionDashboardDto,
  ManorDashboardDto,
  TransportDashboardDto,
  SessionParticipantDto,
} from './dto/admin-dashboard-response.dto';

const TIMEZONE = 'Europe/Paris';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDayView(dateString?: string): Promise<AdminDashboardResponseDto> {
    // Parse the date or use today
    const localDate =
      dateString || format(toZonedTime(new Date(), TIMEZONE), 'yyyy-MM-dd');

    // Parse date components
    const [year, month, day] = localDate.split('-').map(Number);

    // Create boundaries in Europe/Paris timezone
    const dayStartParis = new Date(year, month - 1, day, 0, 0, 0, 0);
    const dayEndParis = new Date(year, month - 1, day + 1, 0, 0, 0, 0);

    // Convert to UTC for transport queries
    const dayStartUtc = fromZonedTime(dayStartParis, TIMEZONE);
    const dayEndUtc = fromZonedTime(dayEndParis, TIMEZONE);

    // Create normalized day UTC for session/stay queries (stored as local day at UTC midnight)
    const normalizedDayUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

    // Fetch all data in parallel
    const [sessions, stays, occurrences] = await Promise.all([
      this.fetchSessions(normalizedDayUtc),
      this.fetchManorStays(normalizedDayUtc),
      this.fetchTransportOccurrences(dayStartUtc, dayEndUtc),
    ]);

    return {
      date: localDate,
      dayStartUtc: dayStartUtc.toISOString(),
      dayEndUtc: dayEndUtc.toISOString(),
      sessions,
      manors: stays,
      transports: occurrences,
    };
  }

  private async fetchSessions(
    normalizedDayUtc: Date,
  ): Promise<SessionDashboardDto[]> {
    const sessions = await this.prisma.session.findMany({
      where: { date: normalizedDayUtc },
      include: {
        site: {
          select: {
            id: true,
            name: true,
          },
        },
        attendances: {
          include: {
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
              },
            },
          },
        },
        ratings: {
          select: {
            id: true,
            userId: true,
            raterId: true,
            score: true,
            comment: true,
            updatedAt: true,
          },
        },
      },
      orderBy: [
        { slot: 'asc' }, // AM before PM
        { startTime: { sort: 'asc', nulls: 'last' } },
      ],
    });

    // Sort by site name as secondary sort
    sessions.sort((a, b) => {
      if (a.slot !== b.slot) return a.slot === 'AM' ? -1 : 1;
      if (a.startTime && b.startTime) {
        if (a.startTime < b.startTime) return -1;
        if (a.startTime > b.startTime) return 1;
      }
      if (a.startTime && !b.startTime) return -1;
      if (!a.startTime && b.startTime) return 1;
      return a.site.name.localeCompare(b.site.name);
    });

    return sessions.map(session => {
      // Create rating lookup map
      const ratingMap = new Map(session.ratings.map(r => [r.userId, r]));

      // Build participants with ratings
      const participants: SessionParticipantDto[] = session.attendances.map(
        attendance => ({
          attendanceId: attendance.id,
          user: {
            id: attendance.user.id,
            firstname: attendance.user.firstname,
            lastname: attendance.user.lastname,
          },
          status: attendance.status,
          comment: attendance.comment,
          respondedAt: attendance.respondedAt.toISOString(),
          outOfContract: attendance.outOfContract,
          createdByAdmin: attendance.createdByAdmin,
          rating: ratingMap.has(attendance.userId)
            ? {
                id: ratingMap.get(attendance.userId)!.id,
                score: ratingMap.get(attendance.userId)!.score,
                comment: ratingMap.get(attendance.userId)!.comment,
                raterId: ratingMap.get(attendance.userId)!.raterId,
                updatedAt: ratingMap
                  .get(attendance.userId)!
                  .updatedAt.toISOString(),
              }
            : null,
        }),
      );

      // Sort participants: YES first, then NO, then by lastname, firstname
      participants.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'YES' ? -1 : 1;
        const lastnameCmp = a.user.lastname.localeCompare(b.user.lastname);
        if (lastnameCmp !== 0) return lastnameCmp;
        return a.user.firstname.localeCompare(b.user.firstname);
      });

      return {
        id: session.id,
        site: session.site,
        date: session.date.toISOString(),
        slot: session.slot,
        startTime: session.startTime ? session.startTime.toISOString() : null,
        endTime: session.endTime ? session.endTime.toISOString() : null,
        isPublished: session.isPublished,
        isCanceled: session.isCanceled,
        notes: session.notes,
        participants,
      };
    });
  }

  private async fetchManorStays(
    normalizedDayUtc: Date,
  ): Promise<ManorDashboardDto[]> {
    const stays = await this.prisma.residenceStay.findMany({
      where: { date: normalizedDayUtc },
      include: {
        manor: {
          select: {
            id: true,
            name: true,
            city: true,
            capacity: true,
            enforceCapacity: true,
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

    // Group by manor
    const manorMap = new Map<string, any>();

    stays.forEach(stay => {
      if (!manorMap.has(stay.manorId)) {
        manorMap.set(stay.manorId, {
          id: stay.manor.id,
          name: stay.manor.name,
          city: stay.manor.city,
          capacity: stay.manor.capacity,
          enforceCapacity: stay.manor.enforceCapacity,
          stays: [],
        });
      }

      manorMap.get(stay.manorId)!.stays.push({
        id: stay.id,
        user: {
          id: stay.user.id,
          firstname: stay.user.firstname,
          lastname: stay.user.lastname,
        },
        status: stay.status,
        overCapacity: stay.overCapacity,
        createdByAdmin: stay.createdByAdmin,
        updatedAt: stay.updatedAt.toISOString(),
      });
    });

    // Convert to array and sort
    const manors = Array.from(manorMap.values());

    // Sort manors by name
    manors.sort((a, b) => a.name.localeCompare(b.name));

    // Sort stays within each manor
    manors.forEach(manor => {
      manor.stays.sort((a, b) => {
        const lastnameCmp = a.user.lastname.localeCompare(b.user.lastname);
        if (lastnameCmp !== 0) return lastnameCmp;
        return a.user.firstname.localeCompare(b.user.firstname);
      });
    });

    return manors;
  }

  private async fetchTransportOccurrences(
    dayStartUtc: Date,
    dayEndUtc: Date,
  ): Promise<TransportDashboardDto[]> {
    const occurrences = await this.prisma.transportOccurrence.findMany({
      where: {
        departureAt: {
          gte: dayStartUtc,
          lt: dayEndUtc,
        },
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            fromLabel: true,
            toLabel: true,
          },
        },
        bookings: {
          include: {
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
              },
            },
          },
        },
      },
      orderBy: {
        departureAt: 'asc',
      },
    });

    return occurrences.map(occurrence => {
      // Sort bookings: CONFIRMED first, then CANCELLED, then by lastname, firstname
      const bookings = occurrence.bookings.map(booking => ({
        id: booking.id,
        user: {
          id: booking.user.id,
          firstname: booking.user.firstname,
          lastname: booking.user.lastname,
        },
        seats: booking.seats,
        status: booking.status,
        updatedAt: booking.updatedAt.toISOString(),
      }));

      bookings.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'CONFIRMED' ? -1 : 1;
        const lastnameCmp = a.user.lastname.localeCompare(b.user.lastname);
        if (lastnameCmp !== 0) return lastnameCmp;
        return a.user.firstname.localeCompare(b.user.firstname);
      });

      return {
        occurrenceId: occurrence.id,
        template: occurrence.template,
        departureAt: occurrence.departureAt.toISOString(),
        status: occurrence.status,
        capacity: occurrence.capacitySnapshot,
        allowOverbook: occurrence.allowOverbookSnapshot,
        bookings,
      };
    });
  }
}
