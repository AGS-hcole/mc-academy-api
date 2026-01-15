import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  GenerateOccurrencesDto,
  ListOccurrencesQueryDto,
  CreateBookingDto,
  CancelOccurrenceDto,
} from './dto';
import {
  parseDate,
  addDays,
  getDayOfWeek,
  combineDateAndTime,
  isBeforeCutoff,
} from './utils/time';
import { TransportOccurrenceStatus } from '@prisma/client';

@Injectable()
export class TransportOccurrencesService {
  constructor(private readonly prisma: PrismaService) {}

  async generateForTemplate(templateId: string, dto: GenerateOccurrencesDto) {
    // Validate dates
    const fromDate = parseDate(dto.fromDate);
    const toDate = parseDate(dto.toDate);

    if (fromDate > toDate) {
      throw new BadRequestException(
        'fromDate must be before or equal to toDate',
      );
    }

    // Get template
    const template = await this.prisma.transportTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException(
        `Transport template with ID ${templateId} not found`,
      );
    }

    if (!template.isActive) {
      throw new BadRequestException(
        'Cannot generate occurrences for inactive template',
      );
    }

    const occurrences = [];
    let currentDate = fromDate;

    while (currentDate <= toDate) {
      const dayOfWeek = getDayOfWeek(currentDate, template.timezone);

      if (template.daysOfWeek.includes(dayOfWeek)) {
        const departureAt = combineDateAndTime(
          currentDate,
          template.timeOfDay,
          template.timezone,
        );

        // Use upsert for idempotence
        const occurrence = await this.prisma.transportOccurrence.upsert({
          where: {
            templateId_departureAt: {
              templateId: template.id,
              departureAt,
            },
          },
          update: {
            capacitySnapshot: template.capacity,
            allowOverbookSnapshot: template.allowOverbook,
          },
          create: {
            templateId: template.id,
            departureAt,
            capacitySnapshot: template.capacity,
            allowOverbookSnapshot: template.allowOverbook,
            status: TransportOccurrenceStatus.SCHEDULED,
          },
        });

        occurrences.push(occurrence);
      }

      currentDate = addDays(currentDate, 1);
    }

    return {
      generated: occurrences.length,
      occurrences,
    };
  }

  async findAll(query: ListOccurrencesQueryDto) {
    const fromDate = parseDate(query.from);
    const toDate = parseDate(query.to);

    // Add one day to toDate to include the entire day
    const toDateEndOfDay = addDays(toDate, 1);

    const where: any = {
      departureAt: {
        gte: fromDate,
        lt: toDateEndOfDay,
      },
    };

    if (query.templateId) {
      where.templateId = query.templateId;
    }

    if (query.status) {
      where.status = query.status;
    }

    const occurrences = await this.prisma.transportOccurrence.findMany({
      where,
      include: {
        template: {
          select: {
            id: true,
            name: true,
            fromLabel: true,
            toLabel: true,
            timezone: true,
          },
        },
        bookings: {
          where: { status: 'CONFIRMED' },
          select: {
            seats: true,
            userId: true,
          },
        },
      },
      orderBy: { departureAt: 'asc' },
    });

    // Calculate booked and available seats
    return occurrences.map(occurrence => {
      const bookedSeats = occurrence.bookings.reduce(
        (sum, booking) => sum + booking.seats,
        0,
      );
      const availableSeats = occurrence.allowOverbookSnapshot
        ? null // Unlimited when overbooking is allowed
        : occurrence.capacitySnapshot - bookedSeats;

      return {
        id: occurrence.id,
        templateId: occurrence.templateId,
        departureAt: occurrence.departureAt,
        capacitySnapshot: occurrence.capacitySnapshot,
        allowOverbookSnapshot: occurrence.allowOverbookSnapshot,
        status: occurrence.status,
        cancelReason: occurrence.cancelReason,
        createdAt: occurrence.createdAt,
        updatedAt: occurrence.updatedAt,
        template: occurrence.template,
        bookedSeats,
        bookings: occurrence.bookings,
        availableSeats,
      };
    });
  }

  async findOne(id: string, userId?: string, isAdmin: boolean = false) {
    const occurrence = await this.prisma.transportOccurrence.findUnique({
      where: { id },
      include: {
        template: true,
        bookings: {
          where: { status: 'CONFIRMED' },
          include: {
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!occurrence) {
      throw new NotFoundException(
        `Transport occurrence with ID ${id} not found`,
      );
    }

    const bookedSeats = occurrence.bookings.reduce(
      (sum, booking) => sum + booking.seats,
      0,
    );
    const availableSeats = occurrence.allowOverbookSnapshot
      ? null
      : occurrence.capacitySnapshot - bookedSeats;

    // Find user's booking if userId is provided
    const myBooking = userId
      ? occurrence.bookings.find(b => b.userId === userId)
      : undefined;

    const result: any = {
      id: occurrence.id,
      templateId: occurrence.templateId,
      departureAt: occurrence.departureAt,
      capacitySnapshot: occurrence.capacitySnapshot,
      allowOverbookSnapshot: occurrence.allowOverbookSnapshot,
      status: occurrence.status,
      cancelReason: occurrence.cancelReason,
      createdAt: occurrence.createdAt,
      updatedAt: occurrence.updatedAt,
      template: occurrence.template,
      bookedSeats,
      availableSeats,
      myBooking: myBooking
        ? {
            id: myBooking.id,
            seats: myBooking.seats,
            status: myBooking.status,
            createdAt: myBooking.createdAt,
          }
        : undefined,
    };

    // Include all bookings if admin
    if (isAdmin) {
      result.bookings = occurrence.bookings.map(b => ({
        id: b.id,
        seats: b.seats,
        status: b.status,
        createdAt: b.createdAt,
        user: b.user,
      }));
    }

    return result;
  }

  async book(occurrenceId: string, userId: string, dto: CreateBookingDto) {
    const seats = dto.seats ?? 1;

    // Use transaction to prevent race conditions
    return this.prisma.$transaction(async tx => {
      // Get occurrence with lock
      const occurrence = await tx.transportOccurrence.findUnique({
        where: { id: occurrenceId },
        include: {
          template: true,
          bookings: {
            where: { status: 'CONFIRMED' },
          },
        },
      });

      if (!occurrence) {
        throw new NotFoundException(
          `Transport occurrence with ID ${occurrenceId} not found`,
        );
      }

      // Check if occurrence is cancelled
      if (occurrence.status === TransportOccurrenceStatus.CANCELLED) {
        throw new BadRequestException('This transport has been cancelled');
      }

      // Check cutoff
      if (
        !isBeforeCutoff(occurrence.departureAt, occurrence.template.timezone)
      ) {
        throw new BadRequestException(
          'Booking deadline has passed. Bookings must be made before midnight on the day of transport.',
        );
      }

      // Check if user already has a booking
      const existingBooking = await tx.transportBooking.findUnique({
        where: {
          occurrenceId_userId: {
            occurrenceId,
            userId,
          },
        },
      });

      // If booking exists, update it to CONFIRMED (allows re-registration after cancellation)
      if (existingBooking) {
        // If already confirmed, throw conflict
        if (existingBooking.status === 'CONFIRMED') {
          throw new ConflictException(
            'You already have a confirmed booking for this transport',
          );
        }

        // Calculate current booked seats (excluding the existing cancelled booking)
        const currentBookedSeats = occurrence.bookings.reduce(
          (sum, booking) => sum + booking.seats,
          0,
        );

        // Check capacity if overbooking is not allowed
        if (!occurrence.allowOverbookSnapshot) {
          if (currentBookedSeats + seats > occurrence.capacitySnapshot) {
            throw new BadRequestException(
              `Not enough seats available. Requested: ${seats}, Available: ${occurrence.capacitySnapshot - currentBookedSeats}`,
            );
          }
        }

        // Update existing booking to CONFIRMED
        return tx.transportBooking.update({
          where: { id: existingBooking.id },
          data: {
            seats,
            status: 'CONFIRMED',
          },
          include: {
            occurrence: {
              include: {
                template: true,
              },
            },
          },
        });
      }

      // Calculate current booked seats
      const currentBookedSeats = occurrence.bookings.reduce(
        (sum, booking) => sum + booking.seats,
        0,
      );

      // Check capacity if overbooking is not allowed
      if (!occurrence.allowOverbookSnapshot) {
        if (currentBookedSeats + seats > occurrence.capacitySnapshot) {
          throw new BadRequestException(
            `Not enough seats available. Requested: ${seats}, Available: ${occurrence.capacitySnapshot - currentBookedSeats}`,
          );
        }
      }

      // Create new booking
      return tx.transportBooking.create({
        data: {
          occurrenceId,
          userId,
          seats,
          status: 'CONFIRMED',
        },
        include: {
          occurrence: {
            include: {
              template: true,
            },
          },
        },
      });
    });
  }

  async cancel(id: string, dto: CancelOccurrenceDto) {
    const occurrence = await this.prisma.transportOccurrence.findUnique({
      where: { id },
    });

    if (!occurrence) {
      throw new NotFoundException(
        `Transport occurrence with ID ${id} not found`,
      );
    }

    return this.prisma.transportOccurrence.update({
      where: { id },
      data: {
        status: TransportOccurrenceStatus.CANCELLED,
        cancelReason: dto.reason,
      },
    });
  }
}
