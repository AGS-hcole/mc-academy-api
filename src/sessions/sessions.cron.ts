// src/sessions/sessions.cron.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { addDays, startOfDay } from 'date-fns';
import { NotificationsService } from 'src/notifications/notifications.service';
import { DateTime } from 'luxon';
import { TrainingGroupsService } from 'src/training-groups/training-groups.service';

const tz = 'Europe/Paris';

/**
 * Build a fixed UTC datetime used only as a time container.
 * Example: 08:30 => 1970-01-01T08:30:00.000Z
 */
function asUtcTime(hours: number, minutes: number): Date {
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));
}

/**
 * Normalize a business day to 00:00:00.000Z
 * Example: 2026-03-30 => 2026-03-30T00:00:00.000Z
 */
function asUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0),
  );
}

@Injectable()
export class SessionsCron {
  private readonly logger = new Logger(SessionsCron.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private trainingGroupsService: TrainingGroupsService,
  ) {}

  /**
   * Génération auto des sessions le vendredi 17:30 (heure Paris)
   */
  @Cron('30 18 * * 5', { timeZone: tz }) // Friday 18:30 Europe/Paris
  async generateSessions() {
    this.logger.log('⏰ Génération auto des sessions');

    const [morningSite, afternoonSite] = await Promise.all([
      this.prisma.site.findFirst({
        where: { isActive: true, isMorningDefault: true },
      }),
      this.prisma.site.findFirst({
        where: { isActive: true, isAfternoonDefault: true },
      }),
    ]);

    if (!morningSite && !afternoonSite) {
      this.logger.warn('Aucun site par défaut (matin/après-midi), skip');
      return;
    }

    if (!morningSite) {
      this.logger.warn('Aucun site avec isMorningDefault=true');
    }

    if (!afternoonSite) {
      this.logger.warn('Aucun site avec isAfternoonDefault=true');
    }

    // Friday -> next Monday
    const today = startOfDay(new Date());
    const startNextWeek = addDays(today, 3);

    // Fixed business hours stored as UTC clock values
    const MORNING_WINDOWS: Array<[number, number, number, number]> = [
      [9, 0, 10, 30],
      [10, 30, 12, 0],
    ];

    const AFTERNOON_WINDOWS: Array<[number, number, number, number]> = [
      [15, 0, 16, 30],
      [16, 30, 18, 0],
    ];

    for (let i = 0; i < 5; i++) {
      const localDay = addDays(startNextWeek, i);

      // Business day stored at UTC midnight
      const dateOnlyUtc = asUtcDay(localDay);

      const holiday = await this.prisma.holidayPeriod.findFirst({
        where: {
          isActive: true,
          startDate: { lte: dateOnlyUtc },
          endDate: { gte: dateOnlyUtc },
        },
      });

      if (holiday) {
        this.logger.log(
          `Jour ${dateOnlyUtc.toISOString()} skip (vacances: ${holiday.label})`,
        );
        continue;
      }

      if (morningSite) {
        for (const [sh, sm, eh, em] of MORNING_WINDOWS) {
          const startTime = asUtcTime(sh, sm);
          const endTime = asUtcTime(eh, em);

          await this.prisma.session.upsert({
            where: {
              siteId_date_startTime_endTime: {
                siteId: morningSite.id,
                date: dateOnlyUtc,
                startTime,
                endTime,
              },
            },
            update: {},
            create: {
              siteId: morningSite.id,
              date: dateOnlyUtc,
              slot: 'AM',
              startTime,
              endTime,
            },
          });
        }
      }

      if (afternoonSite) {
        for (const [sh, sm, eh, em] of AFTERNOON_WINDOWS) {
          const startTime = asUtcTime(sh, sm);
          const endTime = asUtcTime(eh, em);

          await this.prisma.session.upsert({
            where: {
              siteId_date_startTime_endTime: {
                siteId: afternoonSite.id,
                date: dateOnlyUtc,
                startTime,
                endTime,
              },
            },
            update: {},
            create: {
              siteId: afternoonSite.id,
              date: dateOnlyUtc,
              slot: 'PM',
              startTime,
              endTime,
            },
          });
        }
      }
    }

    const endNextWeek = asUtcDay(addDays(startNextWeek, 6));
    const syncResult = await this.trainingGroupsService.applyToSessionsInRange(
      asUtcDay(startNextWeek),
      endNextWeek,
    );

    this.logger.log(
      `✅ Sessions générées puis pré-groupes appliqués (${syncResult.created} attendance(s) créées)`,
    );
  }

  /**
   * Publication des sessions le vendredi 18:00 (heure Paris)
   */
  @Cron('0 19 * * 5', { timeZone: tz }) // vendredi 18:00
  async publishSessions() {
    this.logger.log('⏰ Publication des sessions');

    const now = new Date();
    const updated = await this.prisma.session.updateMany({
      where: { isPublished: false, isCanceled: false, date: { gte: now } },
      data: { isPublished: true, publishedAt: now },
    });

    this.logger.log(`✅ Sessions publiées: ${updated.count}`);

    // Notifier pour les sessions publiées depuis "now - 10 min" (par sécurité)
    const since = new Date(now.getTime() - 10 * 60 * 1000);
    await this.notifications.notifySessionsPublished(since);
  }

  /** Exemple rappel J-1 à 18:00 */
  @Cron('0 19 * * *', { timeZone: tz }) // tous les jours 18:00
  async dayBeforeReminders() {
    const tomorrowLocal = DateTime.now()
      .setZone(tz)
      .plus({ days: 1 })
      .startOf('day')
      .toJSDate();
    await this.notifications.notifyDayReminder(tomorrowLocal);
  }
}
