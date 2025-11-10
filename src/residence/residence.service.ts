import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimeService } from '../time/time.service';
import { CreateResidenceWeekPlanDto, ConfirmPresenceDto } from './dto';
import { User } from '@prisma/client';

@Injectable()
export class ResidenceService {
  constructor(
    private prisma: PrismaService,
    private timeService: TimeService,
  ) {}

  /**
   * Create or update a residence week plan
   */
  async createOrUpdateWeekPlan(
    dto: CreateResidenceWeekPlanDto,
    currentUser: User,
  ) {
    const isAdmin = currentUser.role === 'admin';
    const targetStudentId = dto.studentId || currentUser.id;

    // Non-admins can only create their own plans
    if (!isAdmin && targetStudentId !== currentUser.id) {
      throw new ForbiddenException(
        'You can only manage your own residence plans',
      );
    }

    // Get app settings for window validation
    const settings = await this.prisma.appSetting.findUnique({
      where: { id: 1 },
    });

    if (!settings) {
      throw new BadRequestException('App settings not configured');
    }

    // Check if within planning window (skip for admins)
    if (!isAdmin) {
      const isWithinWindow = this.timeService.isWithinPlanningWindow(
        undefined,
        settings,
      );
      if (!isWithinWindow) {
        throw new ForbiddenException(
          'Residence plans can only be submitted during the weekend planning window',
        );
      }
    }

    // Determine the target week
    let weekStartDate: Date;
    if (dto.weekStartDate) {
      weekStartDate = this.timeService.localDateToUtcMidnight(
        dto.weekStartDate,
      );
    } else {
      weekStartDate = this.timeService.getNextIsoWeekStart();
    }

    // Validate that all nights are within the target week
    const nightDates = dto.nights.map(night =>
      this.timeService.localDateToUtcMidnight(night),
    );

    for (const nightDate of nightDates) {
      if (!this.timeService.isDateWithinWeek(nightDate, weekStartDate)) {
        throw new BadRequestException(
          `Night date ${this.timeService.formatAsLocalDate(nightDate)} is not within the target week`,
        );
      }
    }

    // Check if plan already exists
    const existingPlan = await this.prisma.residenceWeekPlan.findUnique({
      where: {
        studentId_weekStartDate: {
          studentId: targetStudentId,
          weekStartDate,
        },
      },
      include: {
        nights: true,
      },
    });

    if (existingPlan) {
      // Delete existing nights and create new ones
      await this.prisma.residenceNight.deleteMany({
        where: { weekPlanId: existingPlan.id },
      });

      // Create new nights
      await this.prisma.residenceNight.createMany({
        data: nightDates.map(date => ({
          weekPlanId: existingPlan.id,
          date,
        })),
      });

      // Return updated plan
      return this.prisma.residenceWeekPlan.findUnique({
        where: { id: existingPlan.id },
        include: {
          nights: true,
          student: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              email: true,
            },
          },
        },
      });
    } else {
      // Create new plan with nights
      return this.prisma.residenceWeekPlan.create({
        data: {
          studentId: targetStudentId,
          weekStartDate,
          nights: {
            create: nightDates.map(date => ({ date })),
          },
        },
        include: {
          nights: true,
          student: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              email: true,
            },
          },
        },
      });
    }
  }

  /**
   * Get residence week plan for a student
   */
  async getWeekPlan(
    studentId: string,
    weekStartDate: string,
    currentUser: User,
  ) {
    const isAdmin = currentUser.role === 'admin';

    // Non-admins can only view their own plans
    if (!isAdmin && studentId !== currentUser.id) {
      throw new ForbiddenException(
        'You can only view your own residence plans',
      );
    }

    const weekStart = this.timeService.localDateToUtcMidnight(weekStartDate);

    const plan = await this.prisma.residenceWeekPlan.findUnique({
      where: {
        studentId_weekStartDate: {
          studentId,
          weekStartDate: weekStart,
        },
      },
      include: {
        nights: {
          orderBy: { date: 'asc' },
        },
        student: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Residence week plan not found');
    }

    return plan;
  }

  /**
   * Get current user's week plan
   */
  async getMyWeekPlan(weekStartDate: string, currentUser: User) {
    return this.getWeekPlan(currentUser.id, weekStartDate, currentUser);
  }

  /**
   * Confirm presence for a specific night (admin only)
   */
  async confirmPresence(dto: ConfirmPresenceDto, currentUser: User) {
    if (currentUser.role !== 'admin') {
      throw new ForbiddenException('Only admins can confirm presence');
    }

    const date = this.timeService.localDateToUtcMidnight(dto.date);

    // Find the residence night
    const night = await this.prisma.residenceNight.findFirst({
      where: {
        weekPlan: {
          studentId: dto.studentId,
        },
        date,
      },
    });

    if (!night) {
      throw new NotFoundException(
        'Residence night not found for this student and date',
      );
    }

    // Update the confirmed presence
    return this.prisma.residenceNight.update({
      where: { id: night.id },
      data: { confirmedPresent: dto.confirmedPresent },
      include: {
        weekPlan: {
          include: {
            student: {
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
  }

  /**
   * Get all residence plans for a specific week (admin only)
   */
  async getAllPlansForWeek(weekStartDate: string, currentUser: User) {
    if (currentUser.role !== 'admin') {
      throw new ForbiddenException('Only admins can view all residence plans');
    }

    const weekStart = this.timeService.localDateToUtcMidnight(weekStartDate);

    return this.prisma.residenceWeekPlan.findMany({
      where: { weekStartDate: weekStart },
      include: {
        nights: {
          orderBy: { date: 'asc' },
        },
        student: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
      },
      orderBy: {
        student: {
          lastname: 'asc',
        },
      },
    });
  }
}
