import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ResidenceRepository } from './residence.repository';
import { ResidenceTimeService } from './residence-time.service';
import { CreateStayDto, CancelStayDto } from './dto';
import { ResidenceStayStatus } from '@prisma/client';

@Injectable()
export class StaysService {
  constructor(
    private readonly repository: ResidenceRepository,
    private readonly timeService: ResidenceTimeService,
  ) {}

  /**
   * Get user's own stays
   */
  async getMyStays(
    userId: string,
    fromDate?: string,
    toDate?: string,
    includeCanceled = false,
  ) {
    // Validate dates if provided
    if (fromDate && !this.timeService.isValidDateFormat(fromDate)) {
      throw new BadRequestException('Invalid fromDate format. Use YYYY-MM-DD');
    }
    if (toDate && !this.timeService.isValidDateFormat(toDate)) {
      throw new BadRequestException('Invalid toDate format. Use YYYY-MM-DD');
    }

    const fromDateObj = fromDate
      ? this.timeService.localDateToUtcMidnight(fromDate)
      : undefined;
    const toDateObj = toDate
      ? this.timeService.localDateToUtcMidnight(toDate)
      : undefined;

    const stays = await this.repository.findStaysByUser(
      userId,
      fromDateObj,
      toDateObj,
      includeCanceled,
    );

    // Format response
    return stays.map((stay) => ({
      id: stay.id,
      date: this.timeService.formatDateParis(stay.date),
      status: stay.status,
      overCapacity: stay.overCapacity,
      manor: {
        id: stay.manor.id,
        name: stay.manor.name,
        address: stay.manor.address,
        city: stay.manor.city,
      },
      createdAt: stay.createdAt,
    }));
  }

  /**
   * Create a stay
   */
  async createStay(
    dto: CreateStayDto,
    requestingUserId: string,
    isAdmin: boolean,
  ) {
    // Validate date format
    if (!this.timeService.isValidDateFormat(dto.date)) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    // Determine target user
    let targetUserId = requestingUserId;
    if (dto.userId) {
      if (!isAdmin) {
        throw new ForbiddenException(
          'Only admins can create stays for other users',
        );
      }
      targetUserId = dto.userId;
    }

    // Check cutoff for non-admin users
    if (!isAdmin) {
      const beforeCutoff = await this.timeService.isBeforeCutoff(dto.date);
      if (!beforeCutoff) {
        const cutoffInstant = await this.timeService.cutoffInstant(dto.date);
        const cutoffTime = cutoffInstant.toFormat('HH:mm');
        throw new ForbiddenException(
          `Cannot register after cutoff time (${cutoffTime} Europe/Paris on the same day)`,
        );
      }
    }

    // Verify manor exists
    const manor = await this.repository.findManorById(dto.manorId);
    if (!manor) {
      throw new NotFoundException('Manor not found');
    }

    if (!manor.isActive) {
      throw new BadRequestException('Manor is not active');
    }

    const dateObj = this.timeService.localDateToUtcMidnight(dto.date);
    const force = isAdmin && dto.force === true;

    try {
      const result = await this.repository.createStayWithCapacityCheck(
        dto.manorId,
        targetUserId,
        dateObj,
        isAdmin,
        force,
      );

      return {
        id: result.stay.id,
        manorId: result.stay.manorId,
        userId: result.stay.userId,
        date: dto.date,
        status: result.stay.status,
        overCapacity: result.stay.overCapacity,
        createdByAdmin: result.stay.createdByAdmin,
        createdAt: result.stay.createdAt,
      };
    } catch (error) {
      if (error.message === 'CAPACITY_REACHED') {
        throw new ConflictException(
          'Manor capacity reached. Contact an administrator.',
        );
      }
      throw error;
    }
  }

  /**
   * Cancel a stay
   */
  async cancelStay(
    dto: CancelStayDto,
    requestingUserId: string,
    isAdmin: boolean,
  ) {
    // Validate date format
    if (!this.timeService.isValidDateFormat(dto.date)) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    // Determine target user
    let targetUserId = requestingUserId;
    if (dto.userId) {
      if (!isAdmin) {
        throw new ForbiddenException(
          'Only admins can cancel stays for other users',
        );
      }
      targetUserId = dto.userId;
    }

    // Check cutoff for non-admin users
    if (!isAdmin) {
      const beforeCutoff = await this.timeService.isBeforeCutoff(dto.date);
      if (!beforeCutoff) {
        const cutoffInstant = await this.timeService.cutoffInstant(dto.date);
        const cutoffTime = cutoffInstant.toFormat('HH:mm');
        throw new ForbiddenException(
          `Cannot cancel after cutoff time (${cutoffTime} Europe/Paris on the same day)`,
        );
      }
    }

    const dateObj = this.timeService.localDateToUtcMidnight(dto.date);

    // Check if stay exists
    const existingStay = await this.repository.findStay(
      dto.manorId,
      targetUserId,
      dateObj,
    );

    if (!existingStay) {
      throw new NotFoundException('Stay not found');
    }

    if (existingStay.status === ResidenceStayStatus.CANCELED) {
      throw new BadRequestException('Stay is already canceled');
    }

    const canceledStay = await this.repository.cancelStay(
      dto.manorId,
      targetUserId,
      dateObj,
    );

    return {
      id: canceledStay.id,
      manorId: canceledStay.manorId,
      userId: canceledStay.userId,
      date: dto.date,
      status: canceledStay.status,
      updatedAt: canceledStay.updatedAt,
    };
  }

  /**
   * Admin reporting: Get stays for a manor on a specific date
   */
  async getManorStaysReport(manorId: string, date: string) {
    // Validate date format
    if (!this.timeService.isValidDateFormat(date)) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    const manor = await this.repository.findManorById(manorId);
    if (!manor) {
      throw new NotFoundException('Manor not found');
    }

    const dateObj = this.timeService.localDateToUtcMidnight(date);
    const stays = await this.repository.findStaysByManorAndDate(
      manorId,
      dateObj,
    );

    const plannedStays = stays.filter(
      (s) => s.status === ResidenceStayStatus.PLANNED,
    );
    const canceledStays = stays.filter(
      (s) => s.status === ResidenceStayStatus.CANCELED,
    );
    const overCapacityCount = plannedStays.filter((s) => s.overCapacity).length;

    return {
      manor: {
        id: manor.id,
        name: manor.name,
        capacity: manor.capacity,
        enforceCapacity: manor.enforceCapacity,
      },
      date,
      counts: {
        planned: plannedStays.length,
        canceled: canceledStays.length,
        overCapacity: overCapacityCount,
      },
      stays: stays.map((stay) => ({
        id: stay.id,
        status: stay.status,
        overCapacity: stay.overCapacity,
        createdByAdmin: stay.createdByAdmin,
        user: {
          id: stay.user.id,
          firstname: stay.user.firstname,
          lastname: stay.user.lastname,
          email: stay.user.email,
        },
        createdAt: stay.createdAt,
      })),
    };
  }
}
