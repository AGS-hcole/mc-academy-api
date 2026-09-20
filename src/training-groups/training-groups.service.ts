import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceStatus,
  FormulaType,
  Prisma,
  SessionSlot,
} from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from 'src/prisma/prisma.service';
import { computeOutOfContract } from 'src/sessions/utils/out-of-contract.util';
import {
  CreateTrainingGroupDto,
  CreateTrainingGroupScheduleDto,
  TrainingGroupMemberBulkDto,
  UpdateTrainingGroupDto,
  UpdateTrainingGroupScheduleDto,
} from './dto';

@Injectable()
export class TrainingGroupsService {
  private readonly logger = new Logger(TrainingGroupsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.trainingGroup.findMany({
      orderBy: { name: 'asc' },
      include: {
        site: { select: { id: true, name: true } },
        _count: { select: { members: true, schedules: true } },
      },
    });
  }

  async findOne(id: string) {
    const group = await this.prisma.trainingGroup.findUnique({
      where: { id },
      include: {
        site: { select: { id: true, name: true } },
        members: {
          orderBy: [
            { user: { lastname: 'asc' } },
            { user: { firstname: 'asc' } },
          ],
          select: {
            userId: true,
            createdAt: true,
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
        schedules: {
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
      },
    });

    if (!group) throw new NotFoundException('Training group not found');

    return this.mapGroupDetails(group);
  }

  async create(dto: CreateTrainingGroupDto) {
    await this.ensureSiteExists(dto.siteId);

    const memberUserIds = dto.memberUserIds ?? [];
    await this.ensureUsersExist(memberUserIds);

    const scheduleRows = (dto.schedules ?? []).map(schedule =>
      this.toScheduleCreateInput(schedule),
    );

    try {
      const group = await this.prisma.$transaction(async tx => {
        const created = await tx.trainingGroup.create({
          data: {
            name: dto.name,
            siteId: dto.siteId,
            isActive: dto.isActive ?? true,
          },
        });

        if (memberUserIds.length > 0) {
          await tx.trainingGroupMember.createMany({
            data: memberUserIds.map(userId => ({
              groupId: created.id,
              userId,
            })),
            skipDuplicates: true,
          });
        }

        if (scheduleRows.length > 0) {
          await tx.trainingGroupSchedule.createMany({
            data: scheduleRows.map(schedule => ({
              groupId: created.id,
              dayOfWeek: schedule.dayOfWeek,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
            })),
            skipDuplicates: true,
          });
        }

        return created;
      });

      return this.findOne(group.id);
    } catch (error) {
      this.handleKnownError(error, 'Invalid training group payload');
      throw error;
    }
  }

  async update(id: string, dto: UpdateTrainingGroupDto) {
    await this.ensureGroupExists(id);

    if (dto.siteId) {
      await this.ensureSiteExists(dto.siteId);
    }

    try {
      await this.prisma.trainingGroup.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.siteId !== undefined ? { siteId: dto.siteId } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });

      return this.findOne(id);
    } catch (error) {
      this.handleKnownError(error, 'Unable to update training group');
      throw error;
    }
  }

  async remove(id: string) {
    await this.ensureGroupExists(id);
    await this.prisma.trainingGroup.delete({ where: { id } });
    return { message: 'Training group deleted successfully' };
  }

  async addMembers(groupId: string, dto: TrainingGroupMemberBulkDto) {
    await this.ensureGroupExists(groupId);
    await this.ensureUsersExist(dto.userIds);

    await this.prisma.trainingGroupMember.createMany({
      data: dto.userIds.map(userId => ({ groupId, userId })),
      skipDuplicates: true,
    });

    return this.findOne(groupId);
  }

  async removeMembers(groupId: string, dto: TrainingGroupMemberBulkDto) {
    await this.ensureGroupExists(groupId);

    await this.prisma.trainingGroupMember.deleteMany({
      where: {
        groupId,
        userId: { in: dto.userIds },
      },
    });

    return this.findOne(groupId);
  }

  async addSchedule(groupId: string, dto: CreateTrainingGroupScheduleDto) {
    await this.ensureGroupExists(groupId);

    const schedule = this.toScheduleCreateInput(dto);

    try {
      await this.prisma.trainingGroupSchedule.create({
        data: {
          groupId,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
        },
      });
      return this.findOne(groupId);
    } catch (error) {
      this.handleKnownError(error, 'Unable to add schedule');
      throw error;
    }
  }

  async updateSchedule(
    groupId: string,
    scheduleId: string,
    dto: UpdateTrainingGroupScheduleDto,
  ) {
    await this.ensureGroupExists(groupId);

    const existing = await this.prisma.trainingGroupSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!existing || existing.groupId !== groupId) {
      throw new NotFoundException('Training group schedule not found');
    }

    const dayOfWeek = dto.dayOfWeek ?? existing.dayOfWeek;
    const startTime = dto.startTime
      ? this.toUtcTimeContainer(dto.startTime)
      : existing.startTime;
    const endTime = dto.endTime
      ? this.toUtcTimeContainer(dto.endTime)
      : existing.endTime;

    this.assertTimeRange(startTime, endTime);

    try {
      await this.prisma.trainingGroupSchedule.update({
        where: { id: scheduleId },
        data: {
          dayOfWeek,
          startTime,
          endTime,
        },
      });

      return this.findOne(groupId);
    } catch (error) {
      this.handleKnownError(error, 'Unable to update schedule');
      throw error;
    }
  }

  async removeSchedule(groupId: string, scheduleId: string) {
    await this.ensureGroupExists(groupId);

    const existing = await this.prisma.trainingGroupSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!existing || existing.groupId !== groupId) {
      throw new NotFoundException('Training group schedule not found');
    }

    await this.prisma.trainingGroupSchedule.delete({
      where: { id: scheduleId },
    });

    return this.findOne(groupId);
  }

  async applyToSessionsInRange(startDate: Date, endDate: Date) {
    const startUtc = this.asUtcDay(startDate);
    const endUtc = this.asUtcDay(endDate);

    const groups = await this.prisma.trainingGroup.findMany({
      where: { isActive: true },
      include: {
        site: { select: { id: true, name: true } },
        members: {
          select: {
            userId: true,
            user: { select: { formula: true } },
          },
        },
        schedules: true,
      },
    });

    if (groups.length === 0) {
      this.logger.log('No active training groups to apply');
      return { groups: 0, candidates: 0, created: 0 };
    }

    const siteIds = [...new Set(groups.map(group => group.siteId))];

    const sessions = await this.prisma.session.findMany({
      where: {
        siteId: { in: siteIds },
        isCanceled: false,
        date: { gte: startUtc, lte: endUtc },
      },
      select: {
        id: true,
        siteId: true,
        date: true,
        startTime: true,
        endTime: true,
        slot: true,
      },
    });

    const sessionsByKey = new Map<string, (typeof sessions)[number]>();
    for (const session of sessions) {
      if (!session.startTime || !session.endTime) continue;
      sessionsByKey.set(
        this.buildSessionKey(
          session.siteId,
          session.date,
          session.startTime,
          session.endTime,
        ),
        session,
      );
    }

    const candidates = new Map<
      string,
      {
        sessionId: string;
        userId: string;
        outOfContract: boolean;
      }
    >();

    const cursorStart = DateTime.fromJSDate(startUtc, { zone: 'utc' }).startOf(
      'day',
    );
    const cursorEnd = DateTime.fromJSDate(endUtc, { zone: 'utc' }).startOf(
      'day',
    );

    for (const group of groups) {
      if (group.members.length === 0 || group.schedules.length === 0) continue;

      for (const schedule of group.schedules) {
        for (
          let cursor = cursorStart;
          cursor <= cursorEnd;
          cursor = cursor.plus({ days: 1 })
        ) {
          if (cursor.weekday !== schedule.dayOfWeek) continue;

          const targetDate = cursor.toJSDate();
          const session = sessionsByKey.get(
            this.buildSessionKey(
              group.siteId,
              targetDate,
              schedule.startTime,
              schedule.endTime,
            ),
          );

          if (!session) {
            this.logger.warn(
              `No matching session for group ${group.name} on ${cursor.toISODate()} (${this.formatUtcTime(schedule.startTime)}-${this.formatUtcTime(schedule.endTime)} at site ${group.site.name})`,
            );
            continue;
          }

          for (const member of group.members) {
            const dedupeKey = `${session.id}:${member.userId}`;
            if (candidates.has(dedupeKey)) continue;

            candidates.set(dedupeKey, {
              sessionId: session.id,
              userId: member.userId,
              outOfContract: this.isOutOfContract(
                member.user.formula,
                session.slot,
              ),
            });
          }
        }
      }
    }

    if (candidates.size === 0) {
      this.logger.log('Training groups produced no attendance candidates');
      return { groups: groups.length, candidates: 0, created: 0 };
    }

    const result = await this.prisma.attendance.createMany({
      data: Array.from(candidates.values()).map(candidate => ({
        sessionId: candidate.sessionId,
        userId: candidate.userId,
        status: AttendanceStatus.YES,
        outOfContract: candidate.outOfContract,
      })),
      skipDuplicates: true,
    });

    this.logger.log(
      `Training groups attendance sync done: ${result.count} created / ${candidates.size} candidates`,
    );

    return {
      groups: groups.length,
      candidates: candidates.size,
      created: result.count,
    };
  }

  private async ensureGroupExists(id: string) {
    const group = await this.prisma.trainingGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Training group not found');
    return group;
  }

  private async ensureSiteExists(siteId: string) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException('Site not found');
    return site;
  }

  private async ensureUsersExist(userIds: string[]) {
    if (userIds.length === 0) return;

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true },
    });

    if (users.length !== userIds.length) {
      const found = new Set(users.map(user => user.id));
      const missing = userIds.filter(id => !found.has(id));
      throw new NotFoundException(
        `Some users were not found: ${missing.join(', ')}`,
      );
    }
  }

  private toScheduleCreateInput(dto: CreateTrainingGroupScheduleDto) {
    const startTime = this.toUtcTimeContainer(dto.startTime);
    const endTime = this.toUtcTimeContainer(dto.endTime);
    this.assertTimeRange(startTime, endTime);

    return {
      dayOfWeek: dto.dayOfWeek,
      startTime,
      endTime,
    };
  }

  private toUtcTimeContainer(hhmm: string): Date {
    const [hours, minutes] = hhmm.split(':').map(value => parseInt(value, 10));
    return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));
  }

  private assertTimeRange(startTime: Date, endTime: Date) {
    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }
  }

  private mapGroupDetails(group: any) {
    return {
      id: group.id,
      name: group.name,
      isActive: group.isActive,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      site: group.site,
      members: group.members.map(member => ({
        userId: member.userId,
        createdAt: member.createdAt,
        user: member.user,
      })),
      schedules: group.schedules.map(schedule => ({
        id: schedule.id,
        dayOfWeek: schedule.dayOfWeek,
        startTime: this.formatUtcTime(schedule.startTime),
        endTime: this.formatUtcTime(schedule.endTime),
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
      })),
    };
  }

  private formatUtcTime(time: Date) {
    const hours = `${time.getUTCHours()}`.padStart(2, '0');
    const minutes = `${time.getUTCMinutes()}`.padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private asUtcDay(date: Date): Date {
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
  }

  private buildSessionKey(
    siteId: string,
    date: Date,
    startTime: Date,
    endTime: Date,
  ) {
    return `${siteId}|${date.toISOString()}|${startTime.toISOString()}|${endTime.toISOString()}`;
  }

  private isOutOfContract(formula: FormulaType | null, slot: SessionSlot) {
    return computeOutOfContract(formula, slot);
  }

  private handleKnownError(error: any, fallbackMessage: string) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new BadRequestException(
        'A duplicate training group schedule already exists',
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      throw new BadRequestException(fallbackMessage);
    }
  }
}
