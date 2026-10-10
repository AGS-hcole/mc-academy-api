import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/email.service';

const ZONE = 'Europe/Paris';

// Session dates are business days stored at UTC midnight.
export function withdrawalDeadline(date: Date): Date {
  return DateTime.fromISO(date.toISOString().slice(0, 10), { zone: ZONE })
    .startOf('day')
    .toJSDate();
}

export function escapeEmailValue(value: unknown): string {
  return String(value ?? '—').replace(
    /[&<>"'{}$]/g,
    char =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '{': '&#123;',
        '}': '&#125;',
        $: '&#36;',
      })[char]!,
  );
}

@Injectable()
export class SessionWithdrawalService {
  private readonly logger = new Logger(SessionWithdrawalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async withdraw(sessionId: string, userId: string, comment?: string) {
    return this.prisma.$transaction(async tx => {
      const session = await tx.session.findUnique({
        where: { id: sessionId },
        include: { site: true },
      });
      if (!session) throw new NotFoundException('Session not found');
      const attendance = await tx.attendance.findUnique({
        where: { sessionId_userId: { sessionId, userId } },
        include: { user: true },
      });
      if (!attendance) throw new BadRequestException('Not registered');
      // A repeated request is harmless, including after the deadline.
      if (attendance.status === 'NO') return attendance;
      const now = new Date();
      if (now >= withdrawalDeadline(session.date)) {
        throw new ForbiddenException('Withdrawal cutoff passed');
      }

      // Conditional update serializes concurrent withdrawals: only the winner
      // creates emails. The state change and queue writes commit together.
      const changed = await tx.attendance.updateMany({
        where: { id: attendance.id, status: 'YES' },
        data: {
          status: 'NO',
          respondedAt: now,
          ...(comment !== undefined ? { comment } : {}),
        },
      });
      if (changed.count) {
        const admins = await tx.user.findMany({
          where: { role: 'admin' },
          select: { email: true },
        });
        const clock = (value: Date | null) =>
          value?.toISOString().slice(11, 16);
        const user = attendance.user;
        const details = {
          name: user.firstname + ' ' + user.lastname,
          userId,
          email: user.email,
          phone: user.phone,
          sessionId,
          site: session.site.name,
          address: session.site.address,
          city: session.site.city,
          date: session.date.toISOString().slice(0, 10),
          slot: session.slot === 'AM' ? 'Matin' : 'Après-midi',
          start: clock(session.startTime),
          end: clock(session.endTime),
          notes: session.notes,
          comment: comment ?? attendance.comment,
          withdrawnAt: DateTime.fromJSDate(now, { zone: ZONE }).toFormat(
            'dd/MM/yyyy HH:mm:ss ZZZZ',
          ),
          year: now.getUTCFullYear(),
        };
        const replacements = Object.fromEntries(
          Object.entries(details).map(([key, value]) => [
            key,
            escapeEmailValue(value),
          ]),
        );
        await tx.sessionWithdrawalEmail.createMany({
          data: admins.map(admin => ({ recipient: admin.email, replacements })),
        });
      }
      return tx.attendance.findUnique({
        where: { sessionId_userId: { sessionId, userId } },
      });
    });
  }

  // Persisted retries survive restarts and do not undo a successful withdrawal.
  @Cron('*/30 * * * * *')
  async deliverPendingEmails() {
    const now = new Date();
    const pending = await this.prisma.sessionWithdrawalEmail.findMany({
      where: { sentAt: null, availableAt: { lte: now } },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    for (const job of pending) {
      const claimed = await this.prisma.sessionWithdrawalEmail.updateMany({
        where: { id: job.id, sentAt: null, availableAt: { lte: now } },
        data: {
          availableAt: new Date(now.getTime() + 5 * 60_000),
          attempts: { increment: 1 },
        },
      });
      if (!claimed.count) continue;
      try {
        await this.email.sendTemplateEmail(
          job.recipient,
          '',
          'Désinscription à une session',
          'session-withdrawal',
          job.replacements as Record<string, string>,
        );
        await this.prisma.sessionWithdrawalEmail.update({
          where: { id: job.id },
          data: { sentAt: new Date() },
        });
      } catch {
        this.logger.error(
          'Session withdrawal email delivery failed; queued for retry: ' +
            job.id,
        );
      }
    }
  }
}
