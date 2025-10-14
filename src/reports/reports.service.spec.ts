import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('ReportsService - getRatingsSummary', () => {
  let service: ReportsService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    sessionRating: {
      findMany: jest.fn(),
    },
    session: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    jest.clearAllMocks();
  });

  describe('getRatingsSummary', () => {
    const validQuery = {
      from: '2024-01-01T00:00:00Z',
      to: '2024-12-31T23:59:59Z',
    };

    it('should throw BadRequestException if from date is after to date', async () => {
      const query = {
        from: '2024-12-31T00:00:00Z',
        to: '2024-01-01T00:00:00Z',
      };

      await expect(service.getRatingsSummary(query)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getRatingsSummary(query)).rejects.toThrow(
        'from date must be before to date',
      );
    });

    it('should throw BadRequestException if user does not exist', async () => {
      const query = { ...validQuery, userId: 'non-existent-user-id' };
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getRatingsSummary(query)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getRatingsSummary(query)).rejects.toThrow(
        'User not found',
      );
    });

    it('should return empty result for empty date range', async () => {
      mockPrismaService.sessionRating.findMany.mockResolvedValue([]);
      mockPrismaService.session.findMany.mockResolvedValue([]);

      const result = await service.getRatingsSummary(validQuery);

      expect(result.global.count).toBe(0);
      expect(result.global.average).toBeNull();
      expect(result.global.ratedSessions).toBe(0);
      expect(result.global.unratedSessions).toBe(0);
      expect(result.global.distribution).toEqual({
        '1': 0,
        '2': 0,
        '3': 0,
        '4': 0,
        '5': 0,
        '6': 0,
        '7': 0,
        '8': 0,
        '9': 0,
        '10': 0,
      });
      expect(result.contractSplit.contractCount).toBe(0);
      expect(result.contractSplit.nonContractCount).toBe(0);
    });

    it('should filter ratings by userId when provided', async () => {
      const userId = 'user-1';
      const query = { ...validQuery, userId };

      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockPrismaService.sessionRating.findMany.mockResolvedValue([
        {
          id: 'rating-1',
          sessionId: 'session-1',
          userId: 'user-1',
          score: 8,
          session: {
            id: 'session-1',
            attendances: [
              { userId: 'user-1', status: 'YES', outOfContract: false },
            ],
          },
          user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
        },
      ]);
      mockPrismaService.session.findMany.mockResolvedValue([
        {
          id: 'session-1',
          attendances: [
            { userId: 'user-1', status: 'YES', outOfContract: false },
          ],
        },
      ]);

      const result = await service.getRatingsSummary(query);

      expect(result.global.count).toBe(1);
      expect(result.global.average).toBe(8);
      expect(result.perUser).toBeUndefined(); // No perUser when userId specified
      expect(mockPrismaService.sessionRating.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
          }),
        }),
      );
    });

    it('should filter ratings by contract scope when contractScope=contract', async () => {
      const query = { ...validQuery, contractScope: 'contract' as const };

      mockPrismaService.sessionRating.findMany.mockResolvedValue([
        {
          id: 'rating-1',
          sessionId: 'session-1',
          userId: 'user-1',
          score: 8,
          session: {
            id: 'session-1',
            attendances: [
              { userId: 'user-1', status: 'YES', outOfContract: false },
            ],
          },
          user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
        },
        {
          id: 'rating-2',
          sessionId: 'session-2',
          userId: 'user-2',
          score: 7,
          session: {
            id: 'session-2',
            attendances: [
              { userId: 'user-2', status: 'YES', outOfContract: true },
            ],
          },
          user: { id: 'user-2', firstname: 'Jane', lastname: 'Smith' },
        },
      ]);
      mockPrismaService.session.findMany.mockResolvedValue([
        {
          id: 'session-1',
          attendances: [
            { userId: 'user-1', status: 'YES', outOfContract: false },
          ],
        },
      ]);

      const result = await service.getRatingsSummary(query);

      // Should only include contract ratings (outOfContract=false)
      expect(result.global.count).toBe(1);
      expect(result.global.average).toBe(8);
      expect(result.contractSplit.contractCount).toBe(1);
      expect(result.contractSplit.nonContractCount).toBe(0);
    });

    it('should filter ratings by contract scope when contractScope=noContract', async () => {
      const query = { ...validQuery, contractScope: 'noContract' as const };

      mockPrismaService.sessionRating.findMany.mockResolvedValue([
        {
          id: 'rating-1',
          sessionId: 'session-1',
          userId: 'user-1',
          score: 8,
          session: {
            id: 'session-1',
            attendances: [
              { userId: 'user-1', status: 'YES', outOfContract: false },
            ],
          },
          user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
        },
        {
          id: 'rating-2',
          sessionId: 'session-2',
          userId: 'user-2',
          score: 7,
          session: {
            id: 'session-2',
            attendances: [
              { userId: 'user-2', status: 'YES', outOfContract: true },
            ],
          },
          user: { id: 'user-2', firstname: 'Jane', lastname: 'Smith' },
        },
      ]);
      mockPrismaService.session.findMany.mockResolvedValue([
        {
          id: 'session-2',
          attendances: [
            { userId: 'user-2', status: 'YES', outOfContract: true },
          ],
        },
      ]);

      const result = await service.getRatingsSummary(query);

      // Should only include no-contract ratings (outOfContract=true)
      expect(result.global.count).toBe(1);
      expect(result.global.average).toBe(7);
      expect(result.contractSplit.contractCount).toBe(0);
      expect(result.contractSplit.nonContractCount).toBe(1);
    });

    it('should calculate distribution correctly with only 10s', async () => {
      mockPrismaService.sessionRating.findMany.mockResolvedValue([
        {
          id: 'rating-1',
          sessionId: 'session-1',
          userId: 'user-1',
          score: 10,
          session: {
            id: 'session-1',
            attendances: [
              { userId: 'user-1', status: 'YES', outOfContract: false },
            ],
          },
          user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
        },
        {
          id: 'rating-2',
          sessionId: 'session-2',
          userId: 'user-2',
          score: 10,
          session: {
            id: 'session-2',
            attendances: [
              { userId: 'user-2', status: 'YES', outOfContract: false },
            ],
          },
          user: { id: 'user-2', firstname: 'Jane', lastname: 'Smith' },
        },
        {
          id: 'rating-3',
          sessionId: 'session-3',
          userId: 'user-3',
          score: 10,
          session: {
            id: 'session-3',
            attendances: [
              { userId: 'user-3', status: 'YES', outOfContract: false },
            ],
          },
          user: { id: 'user-3', firstname: 'Bob', lastname: 'Johnson' },
        },
      ]);
      mockPrismaService.session.findMany.mockResolvedValue([
        {
          id: 'session-1',
          attendances: [
            { userId: 'user-1', status: 'YES', outOfContract: false },
          ],
        },
        {
          id: 'session-2',
          attendances: [
            { userId: 'user-2', status: 'YES', outOfContract: false },
          ],
        },
        {
          id: 'session-3',
          attendances: [
            { userId: 'user-3', status: 'YES', outOfContract: false },
          ],
        },
      ]);

      const result = await service.getRatingsSummary(validQuery);

      expect(result.global.count).toBe(3);
      expect(result.global.average).toBe(10);
      expect(result.global.distribution['10']).toBe(3);
      expect(result.global.distribution['9']).toBe(0);
      expect(result.global.distribution['1']).toBe(0);
    });

    it('should calculate distribution correctly with mixed scores', async () => {
      mockPrismaService.sessionRating.findMany.mockResolvedValue([
        {
          id: 'rating-1',
          sessionId: 'session-1',
          userId: 'user-1',
          score: 1,
          session: {
            id: 'session-1',
            attendances: [
              { userId: 'user-1', status: 'YES', outOfContract: false },
            ],
          },
          user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
        },
        {
          id: 'rating-2',
          sessionId: 'session-2',
          userId: 'user-2',
          score: 5,
          session: {
            id: 'session-2',
            attendances: [
              { userId: 'user-2', status: 'YES', outOfContract: false },
            ],
          },
          user: { id: 'user-2', firstname: 'Jane', lastname: 'Smith' },
        },
        {
          id: 'rating-3',
          sessionId: 'session-3',
          userId: 'user-3',
          score: 5,
          session: {
            id: 'session-3',
            attendances: [
              { userId: 'user-3', status: 'YES', outOfContract: false },
            ],
          },
          user: { id: 'user-3', firstname: 'Bob', lastname: 'Johnson' },
        },
        {
          id: 'rating-4',
          sessionId: 'session-4',
          userId: 'user-4',
          score: 10,
          session: {
            id: 'session-4',
            attendances: [
              { userId: 'user-4', status: 'YES', outOfContract: false },
            ],
          },
          user: { id: 'user-4', firstname: 'Alice', lastname: 'Brown' },
        },
      ]);
      mockPrismaService.session.findMany.mockResolvedValue([
        {
          id: 'session-1',
          attendances: [
            { userId: 'user-1', status: 'YES', outOfContract: false },
          ],
        },
        {
          id: 'session-2',
          attendances: [
            { userId: 'user-2', status: 'YES', outOfContract: false },
          ],
        },
        {
          id: 'session-3',
          attendances: [
            { userId: 'user-3', status: 'YES', outOfContract: false },
          ],
        },
        {
          id: 'session-4',
          attendances: [
            { userId: 'user-4', status: 'YES', outOfContract: false },
          ],
        },
      ]);

      const result = await service.getRatingsSummary(validQuery);

      expect(result.global.count).toBe(4);
      expect(result.global.average).toBe(5.25); // (1+5+5+10)/4
      expect(result.global.distribution['1']).toBe(1);
      expect(result.global.distribution['5']).toBe(2);
      expect(result.global.distribution['10']).toBe(1);
      expect(result.global.distribution['7']).toBe(0);
    });

    it('should calculate per-user aggregates when no userId specified', async () => {
      mockPrismaService.sessionRating.findMany.mockResolvedValue([
        {
          id: 'rating-1',
          sessionId: 'session-1',
          userId: 'user-1',
          score: 8,
          session: {
            id: 'session-1',
            attendances: [
              { userId: 'user-1', status: 'YES', outOfContract: false },
            ],
          },
          user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
        },
        {
          id: 'rating-2',
          sessionId: 'session-2',
          userId: 'user-1',
          score: 9,
          session: {
            id: 'session-2',
            attendances: [
              { userId: 'user-1', status: 'YES', outOfContract: false },
            ],
          },
          user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
        },
        {
          id: 'rating-3',
          sessionId: 'session-3',
          userId: 'user-2',
          score: 7,
          session: {
            id: 'session-3',
            attendances: [
              { userId: 'user-2', status: 'YES', outOfContract: false },
            ],
          },
          user: { id: 'user-2', firstname: 'Jane', lastname: 'Smith' },
        },
      ]);
      mockPrismaService.session.findMany.mockResolvedValue([
        {
          id: 'session-1',
          attendances: [
            { userId: 'user-1', status: 'YES', outOfContract: false },
          ],
        },
        {
          id: 'session-2',
          attendances: [
            { userId: 'user-1', status: 'YES', outOfContract: false },
          ],
        },
        {
          id: 'session-3',
          attendances: [
            { userId: 'user-2', status: 'YES', outOfContract: false },
          ],
        },
      ]);

      const result = await service.getRatingsSummary(validQuery);

      expect(result.perUser).toBeDefined();
      expect(result.perUser).toHaveLength(2);

      const user1Stats = result.perUser!.find(u => u.user.id === 'user-1');
      expect(user1Stats).toBeDefined();
      expect(user1Stats!.count).toBe(2);
      expect(user1Stats!.average).toBe(8.5); // (8+9)/2

      const user2Stats = result.perUser!.find(u => u.user.id === 'user-2');
      expect(user2Stats).toBeDefined();
      expect(user2Stats!.count).toBe(1);
      expect(user2Stats!.average).toBe(7);
    });

    it('should calculate top and bottom users correctly (min count=3)', async () => {
      mockPrismaService.sessionRating.findMany.mockResolvedValue([
        // User 1: 3 ratings, avg = 9
        {
          id: 'r1',
          sessionId: 's1',
          userId: 'user-1',
          score: 9,
          session: {
            id: 's1',
            attendances: [
              { userId: 'user-1', status: 'YES', outOfContract: false },
            ],
          },
          user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
        },
        {
          id: 'r2',
          sessionId: 's2',
          userId: 'user-1',
          score: 9,
          session: {
            id: 's2',
            attendances: [
              { userId: 'user-1', status: 'YES', outOfContract: false },
            ],
          },
          user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
        },
        {
          id: 'r3',
          sessionId: 's3',
          userId: 'user-1',
          score: 9,
          session: {
            id: 's3',
            attendances: [
              { userId: 'user-1', status: 'YES', outOfContract: false },
            ],
          },
          user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
        },
        // User 2: 3 ratings, avg = 5
        {
          id: 'r4',
          sessionId: 's4',
          userId: 'user-2',
          score: 5,
          session: {
            id: 's4',
            attendances: [
              { userId: 'user-2', status: 'YES', outOfContract: false },
            ],
          },
          user: { id: 'user-2', firstname: 'Jane', lastname: 'Smith' },
        },
        {
          id: 'r5',
          sessionId: 's5',
          userId: 'user-2',
          score: 5,
          session: {
            id: 's5',
            attendances: [
              { userId: 'user-2', status: 'YES', outOfContract: false },
            ],
          },
          user: { id: 'user-2', firstname: 'Jane', lastname: 'Smith' },
        },
        {
          id: 'r6',
          sessionId: 's6',
          userId: 'user-2',
          score: 5,
          session: {
            id: 's6',
            attendances: [
              { userId: 'user-2', status: 'YES', outOfContract: false },
            ],
          },
          user: { id: 'user-2', firstname: 'Jane', lastname: 'Smith' },
        },
        // User 3: only 2 ratings, should be excluded from top/bottom
        {
          id: 'r7',
          sessionId: 's7',
          userId: 'user-3',
          score: 10,
          session: {
            id: 's7',
            attendances: [
              { userId: 'user-3', status: 'YES', outOfContract: false },
            ],
          },
          user: { id: 'user-3', firstname: 'Bob', lastname: 'Johnson' },
        },
        {
          id: 'r8',
          sessionId: 's8',
          userId: 'user-3',
          score: 10,
          session: {
            id: 's8',
            attendances: [
              { userId: 'user-3', status: 'YES', outOfContract: false },
            ],
          },
          user: { id: 'user-3', firstname: 'Bob', lastname: 'Johnson' },
        },
      ]);
      mockPrismaService.session.findMany.mockResolvedValue([
        {
          id: 's1',
          attendances: [
            { userId: 'user-1', status: 'YES', outOfContract: false },
          ],
        },
        {
          id: 's2',
          attendances: [
            { userId: 'user-1', status: 'YES', outOfContract: false },
          ],
        },
        {
          id: 's3',
          attendances: [
            { userId: 'user-1', status: 'YES', outOfContract: false },
          ],
        },
        {
          id: 's4',
          attendances: [
            { userId: 'user-2', status: 'YES', outOfContract: false },
          ],
        },
        {
          id: 's5',
          attendances: [
            { userId: 'user-2', status: 'YES', outOfContract: false },
          ],
        },
        {
          id: 's6',
          attendances: [
            { userId: 'user-2', status: 'YES', outOfContract: false },
          ],
        },
        {
          id: 's7',
          attendances: [
            { userId: 'user-3', status: 'YES', outOfContract: false },
          ],
        },
        {
          id: 's8',
          attendances: [
            { userId: 'user-3', status: 'YES', outOfContract: false },
          ],
        },
      ]);

      const result = await service.getRatingsSummary(validQuery);

      expect(result.topUsers).toBeDefined();
      expect(result.topUsers).toHaveLength(2);
      expect(result.topUsers![0].userId).toBe('user-1');
      expect(result.topUsers![0].average).toBe(9);
      expect(result.topUsers![1].userId).toBe('user-2');
      expect(result.topUsers![1].average).toBe(5);

      expect(result.bottomUsers).toBeDefined();
      expect(result.bottomUsers).toHaveLength(2);
      expect(result.bottomUsers![0].userId).toBe('user-2');
      expect(result.bottomUsers![0].average).toBe(5);
      expect(result.bottomUsers![1].userId).toBe('user-1');
      expect(result.bottomUsers![1].average).toBe(9);
    });

    it('should filter out ratings where attendance status is not YES', async () => {
      mockPrismaService.sessionRating.findMany.mockResolvedValue([
        {
          id: 'rating-1',
          sessionId: 'session-1',
          userId: 'user-1',
          score: 8,
          session: {
            id: 'session-1',
            attendances: [
              { userId: 'user-1', status: 'YES', outOfContract: false },
            ],
          },
          user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
        },
        {
          id: 'rating-2',
          sessionId: 'session-2',
          userId: 'user-2',
          score: 9,
          session: {
            id: 'session-2',
            attendances: [
              { userId: 'user-2', status: 'NO', outOfContract: false },
            ],
          },
          user: { id: 'user-2', firstname: 'Jane', lastname: 'Smith' },
        },
      ]);
      mockPrismaService.session.findMany.mockResolvedValue([
        {
          id: 'session-1',
          attendances: [
            { userId: 'user-1', status: 'YES', outOfContract: false },
          ],
        },
      ]);

      const result = await service.getRatingsSummary(validQuery);

      // Should only count rating-1 (user-1 with YES status)
      expect(result.global.count).toBe(1);
      expect(result.global.average).toBe(8);
    });

    it('should calculate ratedSessions and unratedSessions correctly', async () => {
      mockPrismaService.sessionRating.findMany.mockResolvedValue([
        {
          id: 'rating-1',
          sessionId: 'session-1',
          userId: 'user-1',
          score: 8,
          session: {
            id: 'session-1',
            attendances: [
              { userId: 'user-1', status: 'YES', outOfContract: false },
            ],
          },
          user: { id: 'user-1', firstname: 'John', lastname: 'Doe' },
        },
        {
          id: 'rating-2',
          sessionId: 'session-1',
          userId: 'user-2',
          score: 7,
          session: {
            id: 'session-1',
            attendances: [
              { userId: 'user-1', status: 'YES', outOfContract: false },
              { userId: 'user-2', status: 'YES', outOfContract: false },
            ],
          },
          user: { id: 'user-2', firstname: 'Jane', lastname: 'Smith' },
        },
      ]);
      // 3 total sessions, 1 with ratings, 2 without ratings
      mockPrismaService.session.findMany.mockResolvedValue([
        {
          id: 'session-1',
          attendances: [
            { userId: 'user-1', status: 'YES', outOfContract: false },
            { userId: 'user-2', status: 'YES', outOfContract: false },
          ],
        },
        {
          id: 'session-2',
          attendances: [
            { userId: 'user-3', status: 'YES', outOfContract: false },
          ],
        },
        {
          id: 'session-3',
          attendances: [
            { userId: 'user-4', status: 'YES', outOfContract: false },
          ],
        },
      ]);

      const result = await service.getRatingsSummary(validQuery);

      expect(result.global.ratedSessions).toBe(1);
      expect(result.global.unratedSessions).toBe(2);
    });
  });
});
