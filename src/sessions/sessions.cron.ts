// src/sessions/sessions.cron.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { addDays, startOfDay } from 'date-fns';
import { NotificationsService } from 'src/notifications/notifications.service';
import { DateTime } from 'luxon';

const tz = 'Europe/Paris';

function atLocal(date: Date, h: number, m: number): Date {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

@Injectable()
export class SessionsCron {
  private readonly logger = new Logger(SessionsCron.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Génération auto des sessions le vendredi 17:00 (heure Paris)
   */
  @Cron('30 17 * * 5', { timeZone: tz }) // At 17:00 on Friday
  async generateSessions() {
    this.logger.log('⏰ Génération auto des sessions');

    // Sites défauts
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
    if (!morningSite) this.logger.warn('Aucun site avec isMorningDefault=true');
    if (!afternoonSite)
      this.logger.warn('Aucun site avec isAfternoonDefault=true');

    // Semaine suivante (lundi -> dimanche)
    const today = startOfDay(new Date());
    const startNextWeek = addDays(today, 3); // si on lance vendredi, +3 = lundi prochain

    // Définition des fenêtres (heures en local Europe/Paris)
    const MORNING_WINDOWS: Array<[number, number, number, number]> = [
      [9, 0, 10, 30],
      [10, 30, 12, 0],
    ];
    const AFTERNOON_WINDOWS: Array<[number, number, number, number]> = [
      [15, 0, 16, 30],
      [16, 30, 18, 0],
    ];

    for (let i = 0; i < 7; i++) {
      const localDay = addDays(startNextWeek, i); // date “calendaire” (jour)
      const dateOnlyUtc = startOfDay(localDay);

      // Vacances scolaires ?
      const holiday = await this.prisma.holidayPeriod.findFirst({
        where: {
          isActive: true,
          startDate: { lte: dateOnlyUtc },
          endDate: { gte: dateOnlyUtc },
        },
      });
      if (holiday) {
        this.logger.log(
          `Jour ${localDay.toISOString()} skip (vacances: ${holiday.label})`,
        );
        continue;
      }

      // Génère les 4 sessions
      // Matin (site isMorningDefault)
      if (morningSite) {
        for (const [sh, sm, eh, em] of MORNING_WINDOWS) {
          const startUTC = atLocal(localDay, sh, sm);
          const endUTC = atLocal(localDay, eh, em);

          await this.prisma.session.upsert({
            where: {
              // ⚠️ nécessite un unique composite (siteId, date, startTime, endTime)
              siteId_date_startTime_endTime: {
                siteId: morningSite.id,
                date: dateOnlyUtc,
                startTime: startUTC,
                endTime: endUTC,
              },
            },
            update: {
              // au besoin, on peut mettre à jour d’autres champs
            },
            create: {
              siteId: morningSite.id,
              date: dateOnlyUtc,
              slot: 'AM', // si tu gardes l’enum SessionSlot (AM/PM)
              startTime: startUTC,
              endTime: endUTC,
            },
          });
        }
      }

      // Après-midi (site isAfternoonDefault)
      if (afternoonSite) {
        for (const [sh, sm, eh, em] of AFTERNOON_WINDOWS) {
          const startUTC = atLocal(localDay, sh, sm);
          const endUTC = atLocal(localDay, eh, em);

          await this.prisma.session.upsert({
            where: {
              // ⚠️ nécessite un unique composite (siteId, date, startTime, endTime)
              siteId_date_startTime_endTime: {
                siteId: afternoonSite.id,
                date: dateOnlyUtc,
                startTime: startUTC,
                endTime: endUTC,
              },
            },
            update: {},
            create: {
              siteId: afternoonSite.id,
              date: dateOnlyUtc,
              slot: 'PM',
              startTime: startUTC,
              endTime: endUTC,
            },
          });
        }
      }
    }

    this.logger.log(
      '✅ Sessions générées (matin/AM & après-midi/PM, 4 par jour)',
    );
  }

  /**
   * Publication des sessions le vendredi 18:00 (heure Paris)
   */
  @Cron('0 18 * * 5', { timeZone: 'Europe/Paris' }) // vendredi 18:00
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
