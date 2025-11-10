import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimeService } from '../time/time.service';
import { TransportTemplatesService } from '../transport-templates/transport-templates.service';
import { GenerateRunsDto, AssignStudentDto, CheckinPresenceDto } from './dto';
import { TransportAssignmentStatus } from '@prisma/client';

@Injectable()
export class TransportRunsService {
  private readonly logger = new Logger(TransportRunsService.name);

  constructor(
    private prisma: PrismaService,
    private timeService: TimeService,
    private templatesService: TransportTemplatesService,
  ) {}

  /**
   * Generate transport runs for a specific week
   */
  async generateRunsForWeek(dto: GenerateRunsDto) {
    const weekStart = this.timeService.localDateToUtcMidnight(dto.weekStart);

    this.logger.log(
      `Generating transport runs for week starting ${dto.weekStart}`,
    );

    // Validate that weekStart is a Monday
    const weekday = this.timeService.getParisWeekday(weekStart);
    if (weekday !== 1) {
      throw new BadRequestException('weekStart must be a Monday');
    }

    const runsCreated: any[] = [];

    // Loop through each day of the week (Monday to Sunday)
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(currentDate.getDate() + dayOffset);

      const currentWeekday = this.timeService.getParisWeekday(currentDate);

      // Get active templates for this weekday
      const templates = await this.templatesService.findActiveForWeekday(
        currentWeekday,
        currentDate,
      );

      for (const template of templates) {
        // Combine date and time to get plannedTime
        const plannedTime = this.timeService.combineLocalDateAndTimeToUtc(
          this.timeService.formatAsLocalDate(currentDate),
          template.targetTime,
        );

        // Check if run already exists (idempotency)
        const existingRun = await this.prisma.transportRun.findUnique({
          where: {
            templateId_date_plannedTime: {
              templateId: template.id,
              date: this.timeService.localDateToUtcMidnight(
                this.timeService.formatAsLocalDate(currentDate),
              ),
              plannedTime,
            },
          },
        });

        if (existingRun) {
          this.logger.log(
            `Run already exists for template ${template.name} on ${this.timeService.formatAsLocalDate(currentDate)}`,
          );
          continue;
        }

        // Get students who requested this template on this date
        const planEntries = await this.prisma.transportPlanEntry.findMany({
          where: {
            templateId: template.id,
            date: this.timeService.localDateToUtcMidnight(
              this.timeService.formatAsLocalDate(currentDate),
            ),
            weekPlan: {
              weekStartDate: weekStart,
            },
          },
          include: {
            weekPlan: {
              include: {
                student: true,
              },
            },
          },
        });

        // Create the run
        const run = await this.prisma.transportRun.create({
          data: {
            templateId: template.id,
            date: this.timeService.localDateToUtcMidnight(
              this.timeService.formatAsLocalDate(currentDate),
            ),
            plannedTime,
            vehicle: template.defaultVehicle,
            driverId: template.defaultDriverId,
          },
        });

        // Assign students
        const studentsToAssign = planEntries.map(entry => ({
          studentId: entry.weekPlan.studentId,
        }));

        let assignedCount = 0;
        for (const { studentId } of studentsToAssign) {
          const status =
            assignedCount < template.capacity
              ? TransportAssignmentStatus.ASSIGNED
              : TransportAssignmentStatus.WAITLISTED;

          await this.prisma.transportRunAssignment.create({
            data: {
              runId: run.id,
              studentId,
              status,
              source: 'WEEK_PLAN',
            },
          });

          // Create presence record
          await this.prisma.transportPresence.create({
            data: {
              runId: run.id,
              studentId,
            },
          });

          if (status === TransportAssignmentStatus.ASSIGNED) {
            assignedCount++;
          }
        }

        runsCreated.push({
          runId: run.id,
          template: template.name,
          date: this.timeService.formatAsLocalDate(currentDate),
          assignedCount,
          waitlistedCount: studentsToAssign.length - assignedCount,
        });

        this.logger.log(
          `Created run for ${template.name} on ${this.timeService.formatAsLocalDate(currentDate)}: ${assignedCount} assigned, ${studentsToAssign.length - assignedCount} waitlisted`,
        );
      }
    }

    return {
      weekStart: dto.weekStart,
      runsCreated: runsCreated.length,
      runs: runsCreated,
    };
  }

  /**
   * Get transport runs within a date range
   */
  async getRuns(from: string, to: string) {
    const fromDate = this.timeService.localDateToUtcMidnight(from);
    const toDate = this.timeService.localDateToUtcMidnight(to);

    return this.prisma.transportRun.findMany({
      where: {
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
      include: {
        template: {
          include: {
            destination: true,
          },
        },
        driver: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        assignments: {
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
          orderBy: {
            status: 'asc', // ASSIGNED first, then WAITLISTED
          },
        },
        presences: {
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
      orderBy: [{ date: 'asc' }, { plannedTime: 'asc' }],
    });
  }

  /**
   * Get a single transport run by ID
   */
  async getRunById(id: string) {
    const run = await this.prisma.transportRun.findUnique({
      where: { id },
      include: {
        template: {
          include: {
            destination: true,
          },
        },
        driver: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        assignments: {
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
          orderBy: {
            status: 'asc',
          },
        },
        presences: {
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

    if (!run) {
      throw new NotFoundException(`Transport run with ID ${id} not found`);
    }

    return run;
  }

  /**
   * Assign a student to a run (admin only)
   */
  async assignStudent(runId: string, dto: AssignStudentDto) {
    // Check if run exists
    await this.getRunById(runId);

    // Check if student exists
    const student = await this.prisma.user.findUnique({
      where: { id: dto.studentId },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${dto.studentId} not found`);
    }

    // Check if already assigned
    const existingAssignment =
      await this.prisma.transportRunAssignment.findUnique({
        where: {
          runId_studentId: {
            runId,
            studentId: dto.studentId,
          },
        },
      });

    if (existingAssignment) {
      // Update existing assignment
      const updated = await this.prisma.transportRunAssignment.update({
        where: { id: existingAssignment.id },
        data: {
          status: dto.status || TransportAssignmentStatus.ASSIGNED,
        },
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
      });

      return updated;
    } else {
      // Create new assignment
      const assignment = await this.prisma.transportRunAssignment.create({
        data: {
          runId,
          studentId: dto.studentId,
          status: dto.status || TransportAssignmentStatus.ASSIGNED,
          source: 'ADMIN',
        },
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
      });

      // Create presence record if not exists
      const existingPresence = await this.prisma.transportPresence.findUnique({
        where: {
          runId_studentId: {
            runId,
            studentId: dto.studentId,
          },
        },
      });

      if (!existingPresence) {
        await this.prisma.transportPresence.create({
          data: {
            runId,
            studentId: dto.studentId,
          },
        });
      }

      return assignment;
    }
  }

  /**
   * Check-in presences for a run
   */
  async checkinPresence(runId: string, dto: CheckinPresenceDto) {
    // Check if run exists
    await this.getRunById(runId);

    const results: any[] = [];

    for (const entry of dto.presences) {
      // Find or create presence record
      const presence = await this.prisma.transportPresence.upsert({
        where: {
          runId_studentId: {
            runId,
            studentId: entry.studentId,
          },
        },
        update: {
          mark: entry.mark,
          notes: entry.notes,
        },
        create: {
          runId,
          studentId: entry.studentId,
          mark: entry.mark,
          notes: entry.notes,
        },
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
      });

      results.push(presence);
    }

    return {
      runId,
      presencesUpdated: results.length,
      presences: results,
    };
  }

  /**
   * Remove a student assignment from a run
   */
  async removeAssignment(runId: string, studentId: string) {
    const assignment = await this.prisma.transportRunAssignment.findUnique({
      where: {
        runId_studentId: {
          runId,
          studentId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        'Assignment not found for this student and run',
      );
    }

    await this.prisma.transportRunAssignment.delete({
      where: { id: assignment.id },
    });

    return { message: 'Assignment removed successfully' };
  }
}
