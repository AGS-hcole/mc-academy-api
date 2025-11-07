// src/notifications/notifications.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Session, SessionSlot, User } from '@prisma/client';
import { DateTime } from 'luxon';
import twilio, { Twilio } from 'twilio';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/common/email.service';

const TZ = 'Europe/Paris';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private twilio?: Twilio;

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {
    // Twilio (optional)
    if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN) {
      this.twilio = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    }
  }

  // ---------- Public API ----------

  /**
   * Notify all users about newly published sessions (e.g., Saturday 20:00).
   */
  async notifySessionsPublished(since: Date) {
    // sessions published since "since"
    const sessions = await this.prisma.session.findMany({
      where: { isPublished: true, publishedAt: { gte: since } },
      include: { site: true },
      orderBy: [{ date: 'asc' }, { slot: 'asc' }],
    });

    if (!sessions.length) {
      this.logger.log('No newly published sessions to notify.');
      return;
    }

    // only active users
    const users = await this.prisma.user.findMany({
      where: {},
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        phone: true,
        notifyEmail: true,
        notifySMS: true,
        notifyWhatsApp: true,
      },
    });

    for (const user of users) {
      await this.notifyUserSessionsPublished(user as any, sessions);
    }

    this.logger.log(
      `Notifications sent for ${sessions.length} sessions to ${users.length} users.`,
    );
  }

  /**
   * Reminder for sessions of a given local day (e.g., J-1 18:00).
   */
  async notifyDayReminder(localDay: Date) {
    const start = DateTime.fromJSDate(localDay, { zone: TZ })
      .startOf('day')
      .toUTC()
      .toJSDate();
    const end = DateTime.fromJSDate(localDay, { zone: TZ })
      .endOf('day')
      .toUTC()
      .toJSDate();

    const sessions = await this.prisma.session.findMany({
      where: {
        date: { gte: start, lte: end },
        isPublished: true,
        isCanceled: false,
      },
      include: {
        site: true,
        attendances: {
          where: { status: 'YES' },
          include: { user: true },
        },
      },
      orderBy: [{ slot: 'asc' }],
    });

    for (const session of sessions) {
      // notify only YES attendees
      for (const att of session.attendances) {
        await this.notifyUserDayReminder(att.user as any, session);
      }
    }

    this.logger.log(`Day reminders sent for ${sessions.length} sessions.`);
  }

  // ---------- Per-user notifications ----------

  async notifyUserSessionsPublished(
    user: Pick<
      User,
      | 'firstname'
      | 'lastname'
      | 'email'
      | 'phone'
      | 'notifyEmail'
      | 'notifySMS'
      | 'notifyWhatsApp'
    >,
    sessions: (Session & { site: { name: string } })[],
  ) {
    const subject = 'Nouveaux créneaux disponibles';

    // Format sessions for email template
    const sessionsHtml = sessions
      .map(s => `• ${this.formatSessionLine(s)}`)
      .join('<br/>');

    // Email using template
    if (user.notifyEmail && user.email) {
      const replacements = {
        firstname: user.firstname,
        sessions: sessionsHtml,
        year: new Date().getFullYear().toString(),
        title: subject,
        preheader: 'Les nouveaux créneaux de la semaine sont disponibles',
      };

      try {
        await this.emailService.sendTemplateEmail(
          user.email,
          '',
          subject,
          'sessions-published',
          replacements,
        );
        this.logger.log(`Email sent to ${user.email}: ${subject}`);
      } catch (e) {
        this.logger.error(`Email failed to ${user.email}: ${e?.message ?? e}`);
      }
    }

    // SMS and WhatsApp remain unchanged
    const smsWaText = `Nouveaux créneaux dispo:\n${sessions.map(s => `- ${this.formatSessionLine(s, true)}`).join('\n')}\nRépondre avant ven 18h.`;
    if (user.notifySMS && user.phone) await this.sendSMS(user.phone, smsWaText);
    if (user.notifyWhatsApp && user.phone)
      await this.sendWhatsApp(user.phone, smsWaText);
  }

  async notifyUserDayReminder(
    user: Pick<
      User,
      | 'firstname'
      | 'lastname'
      | 'email'
      | 'phone'
      | 'notifyEmail'
      | 'notifySMS'
      | 'notifyWhatsApp'
    >,
    session: Session & { site: { name: string } },
  ) {
    const subject = 'Rappel de séance';
    const sessionLine = this.formatSessionLine(session);

    // Email using template
    if (user.notifyEmail && user.email) {
      const replacements = {
        firstname: user.firstname,
        session: sessionLine,
        year: new Date().getFullYear().toString(),
        title: subject,
        preheader: "N'oublie pas ta séance aujourd'hui",
      };

      try {
        await this.emailService.sendTemplateEmail(
          user.email,
          '',
          subject,
          'day-reminder',
          replacements,
        );
        this.logger.log(`Email sent to ${user.email}: ${subject}`);
      } catch (e) {
        this.logger.error(`Email failed to ${user.email}: ${e?.message ?? e}`);
      }
    }

    // SMS and WhatsApp remain unchanged
    const smsWaText = `Rappel séance: ${this.formatSessionLine(session, true)}.`;
    if (user.notifySMS && user.phone) await this.sendSMS(user.phone, smsWaText);
    if (user.notifyWhatsApp && user.phone)
      await this.sendWhatsApp(user.phone, smsWaText);
  }

  // ---------- Low-level senders ----------

  private async sendSMS(to: string, body: string) {
    if (!this.twilio || !process.env.TWILIO_SMS_FROM) return;
    try {
      await this.twilio.messages.create({
        from: process.env.TWILIO_SMS_FROM,
        to,
        body,
      });
      this.logger.log(`SMS sent to ${to}`);
    } catch (e) {
      this.logger.error(`SMS failed to ${to}: ${e?.message ?? e}`);
    }
  }

  private async sendWhatsApp(to: string, body: string) {
    if (!this.twilio || !process.env.TWILIO_WA_FROM) return;
    const toWa = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    try {
      await this.twilio.messages.create({
        from: process.env.TWILIO_WA_FROM,
        to: toWa,
        body,
      });
      this.logger.log(`WhatsApp sent to ${to}`);
    } catch (e) {
      this.logger.error(`WhatsApp failed to ${to}: ${e?.message ?? e}`);
    }
  }

  // ---------- Helpers ----------

  private formatSessionLine(
    s: Session & { site: { name: string } },
    plain = false,
  ) {
    // date stored UTC@00:00 → display local day + slot label
    const d = DateTime.fromJSDate(s.date, { zone: 'utc' }).setZone(TZ);
    const dateStr = d.toFormat('ccc dd LLL yyyy'); // e.g., "lun. 08 sept. 2025"
    const slotStr =
      s.slot === SessionSlot.AM
        ? plain
          ? 'Matin'
          : '<strong>Matin</strong>'
        : plain
          ? 'Après-midi'
          : '<strong>Après-midi</strong>';
    const site = s.site?.name ?? 'Site';
    return plain
      ? `${dateStr} • ${slotStr} • ${site}`
      : `${dateStr} • ${slotStr} • ${site}`;
  }
}
