import { AttendanceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TrainingGroupsService } from './training-groups.service';

describe('TrainingGroupsService applyToSessionsInRange', () => {
  const prisma = {
    trainingGroup: { findMany: jest.fn() },
    session: { findMany: jest.fn() },
    attendance: { findMany: jest.fn(), createMany: jest.fn() },
  };
  const service = new TrainingGroupsService(prisma as unknown as PrismaService);
  const date = new Date('2026-10-12T00:00:00.000Z');
  const endDate = new Date('2026-10-18T00:00:00.000Z');
  const startTime = new Date('1970-01-01T09:00:00.000Z');
  const endTime = new Date('1970-01-01T10:30:00.000Z');
  const group = {
    name: 'Monday morning',
    siteId: 'site-1',
    site: { id: 'site-1', name: 'Site 1' },
    members: [
      { userId: 'existing-user', user: { formula: null } },
      { userId: 'missing-user', user: { formula: null } },
    ],
    schedules: [{ dayOfWeek: 1, startTime, endTime }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.trainingGroup.findMany.mockResolvedValue([group]);
    prisma.session.findMany.mockResolvedValue([
      {
        id: 'session-1',
        siteId: 'site-1',
        date,
        startTime,
        endTime,
        slot: 'AM',
      },
    ]);
    prisma.attendance.findMany.mockResolvedValue([
      {
        sessionId: 'session-1',
        userId: 'existing-user',
        status: AttendanceStatus.NO,
        comment: 'Keep my RSVP',
      },
    ]);
    prisma.attendance.createMany.mockResolvedValue({ count: 1 });
  });

  it('creates only missing YES registrations and preserves existing RSVPs', async () => {
    expect(await service.applyToSessionsInRange(date, endDate)).toEqual({
      groups: 1,
      candidates: 2,
      created: 1,
    });
    expect(prisma.trainingGroup.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    );
    expect(prisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          siteId: { in: ['site-1'] },
          isCanceled: false,
          date: { gte: date, lte: endDate },
        },
      }),
    );
    expect(prisma.attendance.createMany).toHaveBeenCalledWith({
      data: [
        {
          sessionId: 'session-1',
          userId: 'missing-user',
          status: AttendanceStatus.YES,
          outOfContract: expect.any(Boolean),
        },
      ],
      skipDuplicates: true,
    });

    prisma.attendance.findMany.mockResolvedValue([
      { sessionId: 'session-1', userId: 'existing-user' },
      { sessionId: 'session-1', userId: 'missing-user' },
    ]);
    prisma.attendance.createMany.mockClear();

    expect(await service.applyToSessionsInRange(date, endDate)).toEqual({
      groups: 1,
      candidates: 2,
      created: 0,
    });
    expect(prisma.attendance.createMany).not.toHaveBeenCalled();
  });

  it('deduplicates members who belong to multiple matching groups', async () => {
    prisma.trainingGroup.findMany.mockResolvedValue([group, group]);
    await service.applyToSessionsInRange(date, endDate);
    expect(prisma.attendance.createMany.mock.calls[0][0].data).toHaveLength(1);
  });

  it('does nothing when no sessions match the group schedules', async () => {
    prisma.session.findMany.mockResolvedValue([]);
    expect(await service.applyToSessionsInRange(date, endDate)).toEqual({
      groups: 1,
      candidates: 0,
      created: 0,
    });
    expect(prisma.attendance.createMany).not.toHaveBeenCalled();
  });

  it('does nothing when no training groups are active', async () => {
    prisma.trainingGroup.findMany.mockResolvedValue([]);
    expect(await service.applyToSessionsInRange(date, endDate)).toEqual({
      groups: 0,
      candidates: 0,
      created: 0,
    });
    expect(prisma.attendance.createMany).not.toHaveBeenCalled();
  });
});
