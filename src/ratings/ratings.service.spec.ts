import { Test, TestingModule } from '@nestjs/testing';
import { RatingsService } from './ratings.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('RatingsService', () => {
  let service: RatingsService;

  const mockPrismaService = {
    session: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    attendance: {
      findUnique: jest.fn(),
    },
    sessionRating: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RatingsService>(RatingsService);
    jest.clearAllMocks();
  });

  describe('upsertRating', () => {
    const sessionId = 'session-1';
    const userId = 'user-1';
    const raterId = 'admin-1';
    const dto = { score: 8, comment: 'Great performance' };

    it('should create a new rating successfully', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue({ id: sessionId });
      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockPrismaService.attendance.findUnique.mockResolvedValue({
        sessionId,
        userId,
        status: 'YES',
      });
      mockPrismaService.sessionRating.upsert.mockResolvedValue({
        id: 'rating-1',
        sessionId,
        userId,
        raterId,
        score: 8,
        comment: 'Great performance',
        createdAt: new Date(),
        updatedAt: new Date(),
        rater: {
          id: raterId,
          firstname: 'Admin',
          lastname: 'User',
        },
      });

      const result = await service.upsertRating(
        sessionId,
        userId,
        raterId,
        dto,
      );

      expect(result).toBeDefined();
      expect(result.score).toBe(8);
      expect(mockPrismaService.sessionRating.upsert).toHaveBeenCalled();
    });

    it('should throw NotFoundException if session does not exist', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(null);

      await expect(
        service.upsertRating(sessionId, userId, raterId, dto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.upsertRating(sessionId, userId, raterId, dto),
      ).rejects.toThrow('Session not found');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue({ id: sessionId });
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.upsertRating(sessionId, userId, raterId, dto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.upsertRating(sessionId, userId, raterId, dto),
      ).rejects.toThrow('User not found');
    });

    it('should throw NotFoundException if user is not present at session', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue({ id: sessionId });
      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockPrismaService.attendance.findUnique.mockResolvedValue(null);

      await expect(
        service.upsertRating(sessionId, userId, raterId, dto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.upsertRating(sessionId, userId, raterId, dto),
      ).rejects.toThrow('User is not registered as present for this session');
    });

    it('should throw NotFoundException if user attendance status is not YES', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue({ id: sessionId });
      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockPrismaService.attendance.findUnique.mockResolvedValue({
        sessionId,
        userId,
        status: 'NO',
      });

      await expect(
        service.upsertRating(sessionId, userId, raterId, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should accept score at lower bound (0)', async () => {
      const dtoWithMinScore = { score: 0, comment: 'Needs improvement' };
      mockPrismaService.session.findUnique.mockResolvedValue({ id: sessionId });
      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockPrismaService.attendance.findUnique.mockResolvedValue({
        sessionId,
        userId,
        status: 'YES',
      });
      mockPrismaService.sessionRating.upsert.mockResolvedValue({
        id: 'rating-1',
        sessionId,
        userId,
        raterId,
        score: 0,
        comment: 'Needs improvement',
        createdAt: new Date(),
        updatedAt: new Date(),
        rater: { id: raterId, firstname: 'Admin', lastname: 'User' },
      });

      const result = await service.upsertRating(
        sessionId,
        userId,
        raterId,
        dtoWithMinScore,
      );

      expect(result.score).toBe(0);
    });

    it('should accept score at upper bound (10)', async () => {
      const dtoWithMaxScore = { score: 10, comment: 'Perfect!' };
      mockPrismaService.session.findUnique.mockResolvedValue({ id: sessionId });
      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockPrismaService.attendance.findUnique.mockResolvedValue({
        sessionId,
        userId,
        status: 'YES',
      });
      mockPrismaService.sessionRating.upsert.mockResolvedValue({
        id: 'rating-1',
        sessionId,
        userId,
        raterId,
        score: 10,
        comment: 'Perfect!',
        createdAt: new Date(),
        updatedAt: new Date(),
        rater: { id: raterId, firstname: 'Admin', lastname: 'User' },
      });

      const result = await service.upsertRating(
        sessionId,
        userId,
        raterId,
        dtoWithMaxScore,
      );

      expect(result.score).toBe(10);
    });

    it('should update existing rating (idempotent upsert)', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue({ id: sessionId });
      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockPrismaService.attendance.findUnique.mockResolvedValue({
        sessionId,
        userId,
        status: 'YES',
      });
      mockPrismaService.sessionRating.upsert.mockResolvedValue({
        id: 'rating-1',
        sessionId,
        userId,
        raterId,
        score: 9,
        comment: 'Updated rating',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date(),
        rater: { id: raterId, firstname: 'Admin', lastname: 'User' },
      });

      const result = await service.upsertRating(sessionId, userId, raterId, {
        score: 9,
        comment: 'Updated rating',
      });

      expect(result.score).toBe(9);
      expect(result.comment).toBe('Updated rating');
      expect(mockPrismaService.sessionRating.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sessionId_userId: {
              sessionId,
              userId,
            },
          },
          update: expect.objectContaining({
            score: 9,
            comment: 'Updated rating',
          }),
        }),
      );
    });
  });

  describe('getSessionRatings', () => {
    const sessionId = 'session-1';

    it('should return ratings and statistics for a session', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue({ id: sessionId });
      mockPrismaService.sessionRating.findMany.mockResolvedValue([
        {
          id: 'r1',
          score: 8,
          rater: { id: 'a1', firstname: 'Admin', lastname: 'One' },
        },
        {
          id: 'r2',
          score: 7,
          rater: { id: 'a2', firstname: 'Admin', lastname: 'Two' },
        },
        {
          id: 'r3',
          score: 9,
          rater: { id: 'a1', firstname: 'Admin', lastname: 'One' },
        },
      ]);

      const result = await service.getSessionRatings(sessionId);

      expect(result.ratings).toHaveLength(3);
      expect(result.stats.count).toBe(3);
      expect(result.stats.average).toBe(8); // (8+7+9)/3 = 8
      expect(result.stats.distribution[8]).toBe(1);
      expect(result.stats.distribution[7]).toBe(1);
      expect(result.stats.distribution[9]).toBe(1);
    });

    it('should throw NotFoundException if session does not exist', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(null);

      await expect(service.getSessionRatings(sessionId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return empty statistics when no ratings exist', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue({ id: sessionId });
      mockPrismaService.sessionRating.findMany.mockResolvedValue([]);

      const result = await service.getSessionRatings(sessionId);

      expect(result.ratings).toHaveLength(0);
      expect(result.stats.count).toBe(0);
      expect(result.stats.average).toBe(0);
    });
  });

  describe('getUserRatings', () => {
    const userId = 'user-1';

    it('should return user ratings without date filter', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockPrismaService.sessionRating.findMany.mockResolvedValue([
        {
          id: 'r1',
          score: 8,
          rater: { id: 'a1', firstname: 'Admin', lastname: 'One' },
          session: {
            id: 's1',
            date: new Date(),
            slot: 'AM',
            site: { id: 'site1', name: 'Site 1' },
          },
        },
        {
          id: 'r2',
          score: 7,
          rater: { id: 'a2', firstname: 'Admin', lastname: 'Two' },
          session: {
            id: 's2',
            date: new Date(),
            slot: 'PM',
            site: { id: 'site2', name: 'Site 2' },
          },
        },
      ]);

      const result = await service.getUserRatings(userId);

      expect(result.ratings).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.average).toBe(7.5);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserRatings(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should filter ratings by date range', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockPrismaService.sessionRating.findMany.mockResolvedValue([
        {
          id: 'r1',
          score: 9,
          rater: { id: 'a1', firstname: 'Admin', lastname: 'One' },
          session: {
            id: 's1',
            date: new Date('2025-02-01'),
            slot: 'AM',
            site: { id: 'site1', name: 'Site 1' },
          },
        },
      ]);

      const result = await service.getUserRatings(
        userId,
        '2025-01-01',
        '2025-12-31',
      );

      expect(result.ratings).toHaveLength(1);
      expect(mockPrismaService.sessionRating.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            session: expect.objectContaining({
              date: expect.objectContaining({
                gte: new Date('2025-01-01'),
                lte: new Date('2025-12-31'),
              }),
            }),
          }),
        }),
      );
    });
  });

  describe('deleteRating', () => {
    const sessionId = 'session-1';
    const userId = 'user-1';

    it('should delete a rating successfully', async () => {
      mockPrismaService.sessionRating.findUnique.mockResolvedValue({
        id: 'rating-1',
        sessionId,
        userId,
      });
      mockPrismaService.sessionRating.delete.mockResolvedValue({});

      const result = await service.deleteRating(sessionId, userId);

      expect(result.message).toBe('Rating deleted successfully');
      expect(mockPrismaService.sessionRating.delete).toHaveBeenCalledWith({
        where: {
          sessionId_userId: {
            sessionId,
            userId,
          },
        },
      });
    });

    it('should throw NotFoundException if rating does not exist', async () => {
      mockPrismaService.sessionRating.findUnique.mockResolvedValue(null);

      await expect(service.deleteRating(sessionId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
