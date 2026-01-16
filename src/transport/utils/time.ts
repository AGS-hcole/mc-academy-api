import { DateTime } from 'luxon';

/**
 * Check if the current time has passed the cutoff for booking a transport occurrence.
 * The cutoff is midnight (00:00) on the day of the transport, in the specified timezone.
 *
 * @param departureAt - The departure date/time of the transport occurrence
 * @param timezone - The timezone (e.g., 'Europe/Paris')
 * @returns true if booking is still allowed (before cutoff), false if cutoff has passed
 */
export function isBeforeCutoff(
  departureAt: Date,
  timezone: string = 'Europe/Paris',
): boolean {
  const now = DateTime.now().setZone(timezone);
  const departure = DateTime.fromJSDate(departureAt).setZone(timezone);

  // Get the start of the departure day (midnight) in the specified timezone
  const cutoffTime = departure.startOf('day');

  // Booking is allowed if current time is before the start of the departure day
  return now < cutoffTime;
}

/**
 * Parse a time string in HH:mm format and combine with a date
 *
 * @param date - The date to combine with the time
 * @param timeOfDay - Time in HH:mm format (e.g., "14:50")
 * @param timezone - The timezone (e.g., 'Europe/Paris')
 * @returns A Date object representing the combined date/time in UTC
 */
export function combineDateAndTime(
  date: Date,
  timeOfDay: string,
  timezone: string = 'Europe/Paris',
): Date {
  const [hours, minutes] = timeOfDay.split(':').map(Number);

  const dateTime = DateTime.fromJSDate(date)
    .setZone(timezone)
    .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });

  return dateTime.toJSDate();
}

/**
 * Get the day of week from a date (1=Monday, 7=Sunday)
 *
 * @param date - The date to check
 * @param timezone - The timezone (e.g., 'Europe/Paris')
 * @returns Day of week (1-7, where 1=Monday, 7=Sunday)
 */
export function getDayOfWeek(
  date: Date,
  timezone: string = 'Europe/Paris',
): number {
  return DateTime.fromJSDate(date).setZone(timezone).weekday;
}

/**
 * Parse a date string in YYYY-MM-DD format to a Date object at midnight in the specified timezone
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @param timezone - The timezone (e.g., 'Europe/Paris')
 * @returns A Date object at midnight in the specified timezone (as UTC)
 */
export function parseDate(
  dateString: string,
  timezone: string = 'Europe/Paris',
): Date {
  return DateTime.fromISO(dateString, { zone: timezone })
    .startOf('day')
    .toJSDate();
}

/**
 * Add days to a date
 *
 * @param date - Starting date
 * @param days - Number of days to add
 * @returns New date with days added
 */
export function addDays(date: Date, days: number): Date {
  return DateTime.fromJSDate(date).plus({ days }).toJSDate();
}
