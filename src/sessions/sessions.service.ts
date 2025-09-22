// src/sessions/sessions.service.ts
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus } from '@prisma/client';
import { isBefore } from 'date-fns';

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
        attendances: { include: { user: true } },
      },
    });
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

    // Cutoff = Friday 18:00 local
    //const cutoff = zonedTimeToUtc(this._computeCutoff(session.date), tz);
    const cutoff = this._computeCutoff(session.date);
    if (isBefore(cutoff, new Date())) {
      throw new ForbiddenException('Cutoff passed');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const outOfContract =
      (user.formula === 'MORNING' && session.slot === 'PM') ||
      (user.formula === 'AFTERNOON' && session.slot === 'AM');

    return this.prisma.attendance.upsert({
      where: { sessionId_userId: { sessionId, userId } },
      update: { status, comment, outOfContract, respondedAt: new Date() },
      create: { sessionId, userId, status, comment, outOfContract },
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
