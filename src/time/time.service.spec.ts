import { Test, TestingModule } from '@nestjs/testing';
import { TimeService } from './time.service';
import { DateTime } from 'luxon';

describe('TimeService', () => {
  let service: TimeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TimeService],
    }).compile();

    service = module.get<TimeService>(TimeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCurrentParisDateTime', () => {
    it('should return current time in Europe/Paris timezone', () => {
      const result = service.getCurrentParisDateTime();
      expect(result.zoneName).toBe('Europe/Paris');
    });
  });

  describe('getNextIsoWeekStart', () => {
    it('should return next Monday when given a Wednesday', () => {
      // Wednesday, November 13, 2025
      const wednesday = new Date('2025-11-13T12:00:00Z');
      const result = service.getNextIsoWeekStart(wednesday);
      
      const dt = DateTime.fromJSDate(result).setZone('Europe/Paris');
      expect(dt.weekday).toBe(1); // Monday
      expect(dt.hour).toBe(0);
      expect(dt.minute).toBe(0);
      
      // Should be November 17, 2025 (next Monday)
      expect(dt.day).toBe(17);
      expect(dt.month).toBe(11);
      expect(dt.year).toBe(2025);
    });

    it('should return next Monday when given a Sunday', () => {
      // Sunday, November 16, 2025
      const sunday = new Date('2025-11-16T12:00:00Z');
      const result = service.getNextIsoWeekStart(sunday);
      
      const dt = DateTime.fromJSDate(result).setZone('Europe/Paris');
      expect(dt.weekday).toBe(1); // Monday
      expect(dt.day).toBe(17);
    });

    it('should return next Monday when given a Monday', () => {
      // Monday, November 10, 2025
      const monday = new Date('2025-11-10T12:00:00Z');
      const result = service.getNextIsoWeekStart(monday);
      
      const dt = DateTime.fromJSDate(result).setZone('Europe/Paris');
      expect(dt.weekday).toBe(1); // Monday
      // Should be next Monday (November 17)
      expect(dt.day).toBe(17);
    });
  });

  describe('isWithinPlanningWindow', () => {
    const settings = {
      planWindowOpenWeekday: 6, // Saturday
      planWindowOpenHourLocal: 0,
      planWindowCloseWeekday: 7, // Sunday
      planWindowCloseHourLocal: 23,
      planWindowCloseMinuteLocal: 59,
    };

    it('should return true for Saturday morning', () => {
      // Saturday, November 15, 2025 at 10:00 (Europe/Paris)
      const saturday = DateTime.fromObject(
        { year: 2025, month: 11, day: 15, hour: 10 },
        { zone: 'Europe/Paris' },
      ).toJSDate();
      
      const result = service.isWithinPlanningWindow(saturday, settings);
      expect(result).toBe(true);
    });

    it('should return true for Sunday evening', () => {
      // Sunday, November 16, 2025 at 20:00 (Europe/Paris)
      const sunday = DateTime.fromObject(
        { year: 2025, month: 11, day: 16, hour: 20 },
        { zone: 'Europe/Paris' },
      ).toJSDate();
      
      const result = service.isWithinPlanningWindow(sunday, settings);
      expect(result).toBe(true);
    });

    it('should return false for Friday', () => {
      // Friday, November 14, 2025 at 12:00 (Europe/Paris)
      const friday = DateTime.fromObject(
        { year: 2025, month: 11, day: 14, hour: 12 },
        { zone: 'Europe/Paris' },
      ).toJSDate();
      
      const result = service.isWithinPlanningWindow(friday, settings);
      expect(result).toBe(false);
    });

    it('should return false for Monday', () => {
      // Monday, November 17, 2025 at 12:00 (Europe/Paris)
      const monday = DateTime.fromObject(
        { year: 2025, month: 11, day: 17, hour: 12 },
        { zone: 'Europe/Paris' },
      ).toJSDate();
      
      const result = service.isWithinPlanningWindow(monday, settings);
      expect(result).toBe(false);
    });

    it('should return true at window open boundary', () => {
      // Saturday, November 15, 2025 at 00:00 (Europe/Paris)
      const saturday = DateTime.fromObject(
        { year: 2025, month: 11, day: 15, hour: 0, minute: 0 },
        { zone: 'Europe/Paris' },
      ).toJSDate();
      
      const result = service.isWithinPlanningWindow(saturday, settings);
      expect(result).toBe(true);
    });

    it('should return true at window close boundary', () => {
      // Sunday, November 16, 2025 at 23:59 (Europe/Paris)
      const sunday = DateTime.fromObject(
        { year: 2025, month: 11, day: 16, hour: 23, minute: 59 },
        { zone: 'Europe/Paris' },
      ).toJSDate();
      
      const result = service.isWithinPlanningWindow(sunday, settings);
      expect(result).toBe(true);
    });
  });

  describe('isDateWithinWeek', () => {
    it('should return true for Monday of the week', () => {
      const monday = new Date('2025-11-17T00:00:00Z');
      const weekStart = new Date('2025-11-17T00:00:00Z');
      
      const result = service.isDateWithinWeek(monday, weekStart);
      expect(result).toBe(true);
    });

    it('should return true for Sunday of the week', () => {
      const sunday = new Date('2025-11-23T00:00:00Z');
      const weekStart = new Date('2025-11-17T00:00:00Z');
      
      const result = service.isDateWithinWeek(sunday, weekStart);
      expect(result).toBe(true);
    });

    it('should return true for Wednesday in the middle of the week', () => {
      const wednesday = new Date('2025-11-19T00:00:00Z');
      const weekStart = new Date('2025-11-17T00:00:00Z');
      
      const result = service.isDateWithinWeek(wednesday, weekStart);
      expect(result).toBe(true);
    });

    it('should return false for date before the week', () => {
      const beforeWeek = new Date('2025-11-16T00:00:00Z');
      const weekStart = new Date('2025-11-17T00:00:00Z');
      
      const result = service.isDateWithinWeek(beforeWeek, weekStart);
      expect(result).toBe(false);
    });

    it('should return false for date after the week', () => {
      const afterWeek = new Date('2025-11-24T00:00:00Z');
      const weekStart = new Date('2025-11-17T00:00:00Z');
      
      const result = service.isDateWithinWeek(afterWeek, weekStart);
      expect(result).toBe(false);
    });
  });

  describe('localDateToUtcMidnight', () => {
    it('should convert local date string to UTC midnight', () => {
      const result = service.localDateToUtcMidnight('2025-11-17');
      const dt = DateTime.fromJSDate(result).setZone('Europe/Paris');
      
      expect(dt.hour).toBe(0);
      expect(dt.minute).toBe(0);
      expect(dt.second).toBe(0);
      expect(dt.day).toBe(17);
      expect(dt.month).toBe(11);
      expect(dt.year).toBe(2025);
    });
  });

  describe('combineLocalDateAndTimeToUtc', () => {
    it('should combine date and time correctly', () => {
      const result = service.combineLocalDateAndTimeToUtc('2025-11-17', '07:45');
      const dt = DateTime.fromJSDate(result).setZone('Europe/Paris');
      
      expect(dt.hour).toBe(7);
      expect(dt.minute).toBe(45);
      expect(dt.day).toBe(17);
      expect(dt.month).toBe(11);
      expect(dt.year).toBe(2025);
    });
  });

  describe('getParisWeekday', () => {
    it('should return 1 for Monday', () => {
      const monday = DateTime.fromObject(
        { year: 2025, month: 11, day: 17 },
        { zone: 'Europe/Paris' },
      ).toJSDate();
      
      expect(service.getParisWeekday(monday)).toBe(1);
    });

    it('should return 7 for Sunday', () => {
      const sunday = DateTime.fromObject(
        { year: 2025, month: 11, day: 23 },
        { zone: 'Europe/Paris' },
      ).toJSDate();
      
      expect(service.getParisWeekday(sunday)).toBe(7);
    });

    it('should return 5 for Friday', () => {
      const friday = DateTime.fromObject(
        { year: 2025, month: 11, day: 21 },
        { zone: 'Europe/Paris' },
      ).toJSDate();
      
      expect(service.getParisWeekday(friday)).toBe(5);
    });
  });

  describe('formatAsLocalDate', () => {
    it('should format date as YYYY-MM-DD in Paris timezone', () => {
      const date = DateTime.fromObject(
        { year: 2025, month: 11, day: 17 },
        { zone: 'Europe/Paris' },
      ).toJSDate();
      
      const result = service.formatAsLocalDate(date);
      expect(result).toBe('2025-11-17');
    });
  });

  describe('getTargetWeekForWindow', () => {
    it('should return next week range', () => {
      // Wednesday, November 13, 2025
      const wednesday = new Date('2025-11-13T12:00:00Z');
      const result = service.getTargetWeekForWindow(wednesday);
      
      const weekStartDt = DateTime.fromJSDate(result.weekStart).setZone('Europe/Paris');
      const weekEndDt = DateTime.fromJSDate(result.weekEnd).setZone('Europe/Paris');
      
      // Week should start on Monday, November 17
      expect(weekStartDt.weekday).toBe(1);
      expect(weekStartDt.day).toBe(17);
      
      // Week should end on Sunday, November 23
      expect(weekEndDt.weekday).toBe(7);
      expect(weekEndDt.day).toBe(23);
    });
  });
});
