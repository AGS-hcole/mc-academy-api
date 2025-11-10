import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';

const PARIS_TZ = 'Europe/Paris';

export interface AppSettingsForWindow {
  planWindowOpenWeekday: number;
  planWindowOpenHourLocal: number;
  planWindowCloseWeekday: number;
  planWindowCloseHourLocal: number;
  planWindowCloseMinuteLocal: number;
}

export interface WeekRange {
  weekStart: Date;
  weekEnd: Date;
}

@Injectable()
export class TimeService {
  /**
   * Get current date/time in Europe/Paris timezone
   */
  getCurrentParisDateTime(): DateTime {
    return DateTime.now().setZone(PARIS_TZ);
  }

  /**
   * Get the next ISO week start (Monday 00:00) from a given date in Europe/Paris
   * @param date Base date (optional, defaults to now)
   * @returns Date object representing Monday 00:00 in UTC
   */
  getNextIsoWeekStart(date?: Date): Date {
    const dt = date
      ? DateTime.fromJSDate(date).setZone(PARIS_TZ)
      : this.getCurrentParisDateTime();

    // Get the start of next week (Monday)
    const currentWeekday = dt.weekday; // 1=Monday, 7=Sunday
    const daysUntilNextMonday = currentWeekday === 7 ? 1 : 8 - currentWeekday;

    const nextMonday = dt
      .plus({ days: daysUntilNextMonday })
      .startOf('day');

    return nextMonday.toJSDate();
  }

  /**
   * Check if current time is within the planning window
   * @param now Current date (optional, defaults to now)
   * @param settings App settings for window configuration
   * @returns true if within planning window
   */
  isWithinPlanningWindow(
    now: Date | undefined,
    settings: AppSettingsForWindow,
  ): boolean {
    const currentDt = now
      ? DateTime.fromJSDate(now).setZone(PARIS_TZ)
      : this.getCurrentParisDateTime();

    const currentWeekday = currentDt.weekday; // 1=Monday, 7=Sunday
    const currentHour = currentDt.hour;
    const currentMinute = currentDt.minute;

    const {
      planWindowOpenWeekday,
      planWindowOpenHourLocal,
      planWindowCloseWeekday,
      planWindowCloseHourLocal,
      planWindowCloseMinuteLocal,
    } = settings;

    // Convert current time to a comparable number
    const currentTime =
      currentWeekday * 10000 + currentHour * 100 + currentMinute;
    const openTime =
      planWindowOpenWeekday * 10000 + planWindowOpenHourLocal * 100;
    const closeTime =
      planWindowCloseWeekday * 10000 +
      planWindowCloseHourLocal * 100 +
      planWindowCloseMinuteLocal;

    // Check if we're within the window
    return currentTime >= openTime && currentTime <= closeTime;
  }

  /**
   * Get the target week (next week) for the planning window
   * @param now Current date (optional, defaults to now)
   * @param settings App settings for window configuration
   * @returns Week range with start and end dates
   */
  getTargetWeekForWindow(
    now: Date | undefined,
    settings: AppSettingsForWindow,
  ): WeekRange {
    const nextMonday = this.getNextIsoWeekStart(now);
    const nextMondayDt = DateTime.fromJSDate(nextMonday).setZone(PARIS_TZ);
    const nextSunday = nextMondayDt
      .plus({ days: 6 })
      .endOf('day')
      .toJSDate();

    return {
      weekStart: nextMonday,
      weekEnd: nextSunday,
    };
  }

  /**
   * Check if a date is within a given week
   * @param date Date to check
   * @param weekStart Monday 00:00 of the week
   * @returns true if date is within the week (Mon-Sun)
   */
  isDateWithinWeek(date: Date, weekStart: Date): boolean {
    const dateDt = DateTime.fromJSDate(date).setZone(PARIS_TZ).startOf('day');
    const weekStartDt = DateTime.fromJSDate(weekStart)
      .setZone(PARIS_TZ)
      .startOf('day');
    const weekEndDt = weekStartDt.plus({ days: 6 }).endOf('day');

    return dateDt >= weekStartDt && dateDt <= weekEndDt;
  }

  /**
   * Convert a local date (YYYY-MM-DD) in Europe/Paris to UTC midnight
   * @param dateString Date string in YYYY-MM-DD format
   * @returns Date object representing midnight UTC for that local date
   */
  localDateToUtcMidnight(dateString: string): Date {
    const dt = DateTime.fromISO(dateString, { zone: PARIS_TZ }).startOf('day');
    return dt.toJSDate();
  }

  /**
   * Combine local date and time (HH:mm) in Europe/Paris to UTC
   * @param dateString Date string in YYYY-MM-DD format
   * @param timeString Time string in HH:mm format
   * @returns Date object in UTC
   */
  combineLocalDateAndTimeToUtc(dateString: string, timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const dt = DateTime.fromISO(dateString, { zone: PARIS_TZ }).set({
      hour: hours,
      minute: minutes,
      second: 0,
      millisecond: 0,
    });
    return dt.toJSDate();
  }

  /**
   * Get the weekday (1=Mon, 7=Sun) of a date in Europe/Paris
   * @param date Date to check
   * @returns ISO weekday number
   */
  getParisWeekday(date: Date): number {
    return DateTime.fromJSDate(date).setZone(PARIS_TZ).weekday;
  }

  /**
   * Format a date as YYYY-MM-DD in Europe/Paris timezone
   * @param date Date to format
   * @returns Formatted date string
   */
  formatAsLocalDate(date: Date): string {
    return DateTime.fromJSDate(date).setZone(PARIS_TZ).toISODate() || '';
  }
}
