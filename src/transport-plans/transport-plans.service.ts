import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimeService } from '../time/time.service';
import { TransportTemplatesService } from '../transport-templates/transport-templates.service';
import { CreateTransportWeekPlanDto } from './dto';
import { User } from '@prisma/client';

@Injectable()
export class TransportPlansService {
  constructor(
    private prisma: PrismaService,
    private timeService: TimeService,
    private templatesService: TransportTemplatesService,
  ) {}

  /**
   * Create or update a transport week plan
   */
  async createOrUpdateWeekPlan(
    dto: CreateTransportWeekPlanDto,
    currentUser: User,
  ) {
    const isAdmin = currentUser.role === 'admin';
    const targetStudentId = dto.studentId || currentUser.id;

    // Non-admins can only create their own plans
    if (!isAdmin && targetStudentId !== currentUser.id) {
      throw new ForbiddenException(
        'You can only manage your own transport plans',
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
          'Transport plans can only be submitted during the weekend planning window',
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

    // Validate all entries
    for (const entry of dto.entries) {
      // Validate template exists
      const template = await this.templatesService.findOne(entry.templateId);

      // Convert entry date to Date object
      const entryDate = this.timeService.localDateToUtcMidnight(entry.date);

      // Validate date is within target week
      if (!this.timeService.isDateWithinWeek(entryDate, weekStartDate)) {
        throw new BadRequestException(
          `Entry date ${entry.date} is not within the target week`,
        );
      }

      // Validate entry date weekday matches template daysOfWeek
      const entryWeekday = this.timeService.getParisWeekday(entryDate);
      if (!template.daysOfWeek.includes(entryWeekday)) {
        throw new BadRequestException(
          `Template ${template.name} is not active on ${this.getWeekdayName(entryWeekday)} (entry date: ${entry.date})`,
        );
      }

      // Validate template is active for this date
      if (template.activeFrom && entryDate < template.activeFrom) {
        throw new BadRequestException(
          `Template ${template.name} is not yet active on ${entry.date}`,
        );
      }
      if (template.activeTo && entryDate > template.activeTo) {
        throw new BadRequestException(
          `Template ${template.name} is no longer active on ${entry.date}`,
        );
      }
    }

    // Check if plan already exists
    const existingPlan = await this.prisma.transportWeekPlan.findUnique({
      where: {
        studentId_weekStartDate: {
          studentId: targetStudentId,
          weekStartDate,
        },
      },
      include: {
        entries: true,
      },
    });

    if (existingPlan) {
      // Delete existing entries and create new ones
      await this.prisma.transportPlanEntry.deleteMany({
        where: { weekPlanId: existingPlan.id },
      });

      // Create new entries
      for (const entry of dto.entries) {
        const entryTemplate = await this.templatesService.findOne(
          entry.templateId,
        );
        await this.prisma.transportPlanEntry.create({
          data: {
            weekPlanId: existingPlan.id,
            templateId: entry.templateId,
            date: this.timeService.localDateToUtcMidnight(entry.date),
            direction: entry.direction || entryTemplate.direction,
          },
        });
      }

      // Return updated plan
      return this.prisma.transportWeekPlan.findUnique({
        where: { id: existingPlan.id },
        include: {
          entries: {
            include: {
              template: {
                include: {
                  destination: true,
                },
              },
            },
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
    } else {
      // Create new plan with entries
      const entriesData = await Promise.all(
        dto.entries.map(async entry => {
          const entryTemplate = await this.templatesService.findOne(
            entry.templateId,
          );
          return {
            templateId: entry.templateId,
            date: this.timeService.localDateToUtcMidnight(entry.date),
            direction: entry.direction || entryTemplate.direction,
          };
        }),
      );

      return this.prisma.transportWeekPlan.create({
        data: {
          studentId: targetStudentId,
          weekStartDate,
          entries: {
            create: entriesData,
          },
        },
        include: {
          entries: {
            include: {
              template: {
                include: {
                  destination: true,
                },
              },
            },
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
    }
  }

  /**
   * Get transport week plan for a student
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
        'You can only view your own transport plans',
      );
    }

    const weekStart = this.timeService.localDateToUtcMidnight(weekStartDate);

    const plan = await this.prisma.transportWeekPlan.findUnique({
      where: {
        studentId_weekStartDate: {
          studentId,
          weekStartDate: weekStart,
        },
      },
      include: {
        entries: {
          include: {
            template: {
              include: {
                destination: true,
              },
            },
          },
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
      throw new NotFoundException('Transport week plan not found');
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
   * Get all transport plans for a specific week (admin only)
   */
  async getAllPlansForWeek(weekStartDate: string, currentUser: User) {
    if (currentUser.role !== 'admin') {
      throw new ForbiddenException('Only admins can view all transport plans');
    }

    const weekStart = this.timeService.localDateToUtcMidnight(weekStartDate);

    return this.prisma.transportWeekPlan.findMany({
      where: { weekStartDate: weekStart },
      include: {
        entries: {
          include: {
            template: {
              include: {
                destination: true,
              },
            },
          },
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

  private getWeekdayName(weekday: number): string {
    const days = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    return days[weekday - 1] || 'Unknown';
  }
}
