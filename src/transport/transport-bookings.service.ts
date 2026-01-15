import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransportBookingStatus } from '@prisma/client';

@Injectable()
export class TransportBookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async cancel(bookingId: string, userId: string, isAdmin: boolean) {
    const booking = await this.prisma.transportBooking.findUnique({
      where: { id: bookingId },
      include: {
        occurrence: {
          include: {
            template: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    // Check permissions: user can only cancel their own booking, admin can cancel any
    if (!isAdmin && booking.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own bookings');
    }

    // Update booking status to CANCELLED
    return this.prisma.transportBooking.update({
      where: { id: bookingId },
      data: {
        status: TransportBookingStatus.CANCELLED,
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

  async findByOccurrence(occurrenceId: string) {
    return this.prisma.transportBooking.findMany({
      where: { occurrenceId },
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
      orderBy: { createdAt: 'asc' },
    });
  }
}
