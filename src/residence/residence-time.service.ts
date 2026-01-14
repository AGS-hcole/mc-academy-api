import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma/prisma.service';

const PARIS_TZ = 'Europe/Paris';

@Injectable()
export class ResidenceTimeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get current time in Europe/Paris timezone
   */
  nowParis(): DateTime {
    return DateTime.now().setZone(PARIS_TZ);
  }

  /**
   * Parse a local date string (YYYY-MM-DD) as a DateTime in Europe/Paris at 00:00
   */
  parseLocalDate(dateStr: string): DateTime {
    return DateTime.fromFormat(dateStr, 'yyyy-MM-dd', { zone: PARIS_TZ });
  }

  /**
   * Convert a local date string (YYYY-MM-DD) to UTC midnight Date for DB storage
   */
  localDateToUtcMidnight(dateStr: string): Date {
    const localDate = this.parseLocalDate(dateStr);
    return localDate.toUTC().toJSDate();
  }

  /**
   * Get cutoff instant for a given date string using AppSettings
   * Returns the DateTime at which user modifications are no longer allowed
   */
  async cutoffInstant(dateStr: string): Promise<DateTime> {
    const settings = await this.prisma.appSetting.findUnique({
      where: { id: 1 },
    });

    if (!settings) {
      throw new Error('AppSetting not found');
    }

    const localDate = this.parseLocalDate(dateStr);
    return localDate.set({
      hour: settings.residenceCutoffHourLocal,
      minute: settings.residenceCutoffMinuteLocal,
      second: 0,
      millisecond: 0,
    });
  }

  /**
   * Check if current time is before cutoff for a given date
   */
  async isBeforeCutoff(dateStr: string): Promise<boolean> {
    const now = this.nowParis();
    const cutoff = await this.cutoffInstant(dateStr);
    return now < cutoff;
  }

  /**
   * Format a Date object to YYYY-MM-DD string in Paris timezone
   */
  formatDateParis(date: Date): string {
    const dt = DateTime.fromJSDate(date).setZone(PARIS_TZ);
    return dt.toFormat('yyyy-MM-dd');
  }

  /**
   * Validate YYYY-MM-DD format
   */
  isValidDateFormat(dateStr: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) {
      return false;
    }
    const dt = this.parseLocalDate(dateStr);
    return dt.isValid;
  }
}
