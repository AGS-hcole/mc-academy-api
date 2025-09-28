// src/sessions/sessions.cron.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { addDays, startOfDay } from 'date-fns';
import { NotificationsService } from 'src/notifications/notifications.service';
import { DateTime } from 'luxon';

const tz = 'Europe/Paris';

@Injectable()
export class SessionsCron {
  private readonly logger = new Logger(SessionsCron.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Génération auto des sessions le vendredi 00:00 (heure Paris)
   */
  @Cron('0 0 * * 5', { timeZone: tz }) // At 00:00 on Friday
  async generateSessions() {
    this.logger.log('⏰ Génération auto des sessions');

    // Récupère tous les sites actifs
    const sites = await this.prisma.site.findMany({
      where: { isActive: true },
    });
    if (!sites.length) {
      this.logger.warn('Aucun site actif, skip');
      return;
    }

    // Génère la semaine suivante (lundi -> dimanche)
    const today = startOfDay(new Date());
    const startNextWeek = addDays(today, 3); // lundi prochain si vendredi = today
    for (let i = 0; i < 7; i++) {
      const localDay = addDays(startNextWeek, i);
      //const dateAtUTC = ftz.zonedTimeToUtc(localDay, tz);
      const dateAtUTC = localDay;

      // Vérifie vacances scolaires
      const holiday = await this.prisma.holidayPeriod.findFirst({
        where: {
          isActive: true,
          startDate: { lte: dateAtUTC },
          endDate: { gte: dateAtUTC },
        },
      });
      if (holiday) {
        this.logger.log(
          `Jour ${localDay.toISOString()} skip (vacances: ${holiday.label})`,
        );
        continue;
      }

      for (const slot of ['AM', 'PM'] as const) {
        for (const site of sites) {
          // Set default times based on slot
          const sessionDate = new Date(dateAtUTC);
          const startTime = new Date(sessionDate);
          const endTime = new Date(sessionDate);

          if (slot === 'AM') {
            startTime.setHours(9, 0, 0, 0); // 9:00 AM
            endTime.setHours(12, 0, 0, 0); // 12:00 PM
          } else {
            startTime.setHours(14, 0, 0, 0); // 2:00 PM
            endTime.setHours(17, 0, 0, 0); // 5:00 PM
          }

          await this.prisma.session.upsert({
            where: {
              siteId_date_slot: { siteId: site.id, date: dateAtUTC, slot },
            },
            update: {
              // Update times for existing sessions if they don't have them
              startTime: {
                set: startTime,
              },
              endTime: {
                set: endTime,
              },
            },
            create: {
              siteId: site.id,
              date: dateAtUTC,
              slot,
              startTime,
              endTime,
            },
          });
        }
      }
    }

    this.logger.log('✅ Sessions générées');
  }

  /**
   * Publication des sessions le samedi 20:00 (heure Paris)
   */
  @Cron('0 20 * * 6', { timeZone: 'Europe/Paris' }) // samedi 20:00
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
  @Cron('0 18 * * *', { timeZone: 'Europe/Paris' }) // tous les jours 18:00
  async dayBeforeReminders() {
    const tomorrowLocal = DateTime.now()
      .setZone('Europe/Paris')
      .plus({ days: 1 })
      .startOf('day')
      .toJSDate();
    await this.notifications.notifyDayReminder(tomorrowLocal);
  }
}
