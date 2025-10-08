// src/sessions/sessions.service.ts
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus, SessionSlot, User } from '@prisma/client';
import { isBefore, startOfDay, endOfDay } from 'date-fns';
import { CreateSessionDto, UpdateSessionDto, AdminRegisterDto } from './dto';

//const tz = 'Europe/Paris';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  async getUpcomingSessions() {
    const now = new Date();
    return this.prisma.session.findMany({
      where: { date: { gte: now } },
      orderBy: [{ date: 'asc' }, { slot: 'asc' }],
      include: {
        site: true,
        attendances: { include: { user: true } },
      },
    });
  }

  async getAllSessions(filters?: {
    siteId?: string;
    startDate?: Date;
    endDate?: Date;
    slot?: SessionSlot;
    isPublished?: boolean;
    isCanceled?: boolean;
  }) {
    const where: any = {};

    if (filters?.siteId) where.siteId = filters.siteId;
    if (filters?.slot) where.slot = filters.slot;
    if (filters?.isPublished !== undefined)
      where.isPublished = filters.isPublished;
    if (filters?.isCanceled !== undefined)
      where.isCanceled = filters.isCanceled;

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = startOfDay(filters.startDate);
      if (filters.endDate) where.date.lte = endOfDay(filters.endDate);
    }

    return this.prisma.session.findMany({
      where,
      orderBy: [{ date: 'asc' }, { slot: 'asc' }],
      include: {
        site: true,
        attendances: { include: { user: true } },
      },
    });
  }

  async getSessionById(id: string) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        site: true,
        attendances: { include: { user: true } },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async createSession(dto: CreateSessionDto) {
    // Check if site exists
    const site = await this.prisma.site.findUnique({
      where: { id: dto.siteId },
    });
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    // Parse dates
    const sessionDate = new Date(dto.date);
    const startTime = dto.startTime ? new Date(dto.startTime) : null;
    const endTime = dto.endTime ? new Date(dto.endTime) : null;

    // Validate time range
    if (startTime && endTime && startTime >= endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    try {
      return await this.prisma.session.create({
        data: {
          siteId: dto.siteId,
          date: sessionDate,
          slot: dto.slot,
          startTime,
          endTime,
          notes: dto.notes,
          isPublished: dto.isPublished ?? false,
        },
        include: {
          site: true,
          attendances: { include: { user: true } },
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'A session already exists for this site, date, and slot',
        );
      }
      throw error;
    }
  }

  async updateSession(id: string, dto: UpdateSessionDto) {
    const session = await this.prisma.session.findUnique({
      where: { id },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // If updating site, check if it exists
    if (dto.siteId && dto.siteId !== session.siteId) {
      const site = await this.prisma.site.findUnique({
        where: { id: dto.siteId },
      });
      if (!site) {
        throw new NotFoundException('Site not found');
      }
    }

    // Parse dates if provided
    const updateData: any = { ...dto };
    if (dto.date) updateData.date = new Date(dto.date);
    if (dto.startTime) updateData.startTime = new Date(dto.startTime);
    if (dto.endTime) updateData.endTime = new Date(dto.endTime);

    // Validate time range if both times are provided or being updated
    const startTime = updateData.startTime || session.startTime;
    const endTime = updateData.endTime || session.endTime;
    if (startTime && endTime && startTime >= endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    try {
      return await this.prisma.session.update({
        where: { id },
        data: updateData,
        include: {
          site: true,
          attendances: { include: { user: true } },
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'A session already exists for this site, date, and slot',
        );
      }
      throw error;
    }
  }

  async deleteSession(id: string) {
    const session = await this.prisma.session.findUnique({
      where: { id },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.prisma.session.delete({
      where: { id },
    });

    return { message: 'Session deleted successfully' };
  }

  async rsvp(
    sessionId: string,
    userId: string,
    status: AttendanceStatus,
    comment?: string,
  ) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');

    const cutoff = this._computeCutoff(session.date);
    if (isBefore(cutoff, new Date())) {
      throw new ForbiddenException('Cutoff passed');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // ✅ Validation runtime: status requis + valeur d'énum valide
    if (!status || !Object.values(AttendanceStatus).includes(status)) {
      throw new BadRequestException('Invalid or missing status');
    }

    const outOfContract =
      (user.formula === 'MORNING' && session.slot === 'PM') ||
      (user.formula === 'AFTERNOON' && session.slot === 'AM');

    // ✅ Omettre les clés undefined dans update/create
    const updateData: any = {
      outOfContract,
      respondedAt: new Date(),
      ...(status !== undefined ? { status } : {}),
      ...(comment !== undefined ? { comment } : {}),
    };

    const createData: any = {
      sessionId,
      userId,
      status, // requis en create
      outOfContract,
      ...(comment !== undefined ? { comment } : {}),
    };

    return this.prisma.attendance.upsert({
      where: { sessionId_userId: { sessionId, userId } },
      update: updateData,
      create: createData,
    });
  }

  async adminRegister(
    sessionId: string,
    dto: AdminRegisterDto,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    adminUser: User,
  ) {
    // Check if session exists
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');

    // Check if target user exists
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) throw new NotFoundException('User not found');

    // Admin can register anyone without restrictions (bypass cutoff and formula)
    const outOfContract =
      (user.formula === 'MORNING' && session.slot === 'PM') ||
      (user.formula === 'AFTERNOON' && session.slot === 'AM');

    return this.prisma.attendance.upsert({
      where: { sessionId_userId: { sessionId, userId: dto.userId } },
      update: {
        status: dto.status,
        comment: dto.comment,
        outOfContract,
        respondedAt: new Date(),
        createdByAdmin: true,
      },
      create: {
        sessionId,
        userId: dto.userId,
        status: dto.status,
        comment: dto.comment,
        outOfContract,
        createdByAdmin: true,
      },
    });
  }

  private _computeCutoff(sessionDate: Date): Date {
    // cutoff is always Friday 18h of the week of the session
    // (simplify: take Friday before the session date)
    const day = new Date(sessionDate);
    day.setUTCHours(0, 0, 0, 0);
    // ISO: Monday=1..Sunday=7, Friday=5
    const dayOfWeek = ((day.getUTCDay() + 6) % 7) + 1;
    const diff = dayOfWeek >= 5 ? dayOfWeek - 5 : 7 + dayOfWeek - 5;
    day.setDate(day.getDate() - diff);
    day.setHours(18, 0, 0, 0);
    return day;
  }
}
