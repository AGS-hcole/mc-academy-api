import { Test, TestingModule } from '@nestjs/testing';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';

// Mock the guards to avoid import issues in tests
jest.mock('../auth/guards/auth.guards', () => ({
  AuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn(() => true),
  })),
}));

jest.mock('../auth/guards/admin.guard', () => ({
  AdminGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn(() => true),
  })),
}));

describe('RatingsController', () => {
  let controller: RatingsController;

  const mockRatingsService = {
    upsertRating: jest.fn(),
    getSessionRatings: jest.fn(),
    getUserRatings: jest.fn(),
    deleteRating: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RatingsController],
      providers: [
        {
          provide: RatingsService,
          useValue: mockRatingsService,
        },
      ],
    }).compile();

    controller = module.get<RatingsController>(RatingsController);
    jest.clearAllMocks();
  });

  describe('upsertRating', () => {
    it('should create or update a rating', async () => {
      const sessionId = 'session-1';
      const userId = 'user-1';
      const raterId = 'admin-1';
      const dto = { score: 8, comment: 'Great performance' };
      const req = { user: { id: raterId } };

      const expectedResult = {
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
      };

      mockRatingsService.upsertRating.mockResolvedValue(expectedResult);

      const result = await controller.upsertRating(sessionId, userId, dto, req);

      expect(result).toEqual(expectedResult);
      expect(mockRatingsService.upsertRating).toHaveBeenCalledWith(
        sessionId,
        userId,
        raterId,
        dto,
      );
    });

    it('should use user.sub as raterId if user.id is not available', async () => {
      const sessionId = 'session-1';
      const userId = 'user-1';
      const raterId = 'admin-1';
      const dto = { score: 8 };
      const req = { user: { sub: raterId } };

      mockRatingsService.upsertRating.mockResolvedValue({});

      await controller.upsertRating(sessionId, userId, dto, req);

      expect(mockRatingsService.upsertRating).toHaveBeenCalledWith(
        sessionId,
        userId,
        raterId,
        dto,
      );
    });
  });

  describe('getSessionRatings', () => {
    it('should return ratings and statistics for a session', async () => {
      const sessionId = 'session-1';
      const expectedResult = {
        ratings: [
          {
            id: 'r1',
            sessionId,
            userId: 'u1',
            raterId: 'a1',
            score: 8,
            comment: 'Good',
            createdAt: new Date(),
            updatedAt: new Date(),
            rater: {
              id: 'a1',
              firstname: 'Admin',
              lastname: 'One',
            },
          },
        ],
        stats: {
          average: 8,
          count: 1,
          distribution: {
            '0': 0,
            '1': 0,
            '2': 0,
            '3': 0,
            '4': 0,
            '5': 0,
            '6': 0,
            '7': 0,
            '8': 1,
            '9': 0,
            '10': 0,
          },
        },
      };

      mockRatingsService.getSessionRatings.mockResolvedValue(expectedResult);

      const result = await controller.getSessionRatings(sessionId);

      expect(result).toEqual(expectedResult);
      expect(mockRatingsService.getSessionRatings).toHaveBeenCalledWith(
        sessionId,
      );
    });
  });

  describe('getUserRatings', () => {
    it('should return user ratings without date filter', async () => {
      const userId = 'user-1';
      const expectedResult = {
        average: 7.5,
        count: 2,
        ratings: [
          {
            id: 'r1',
            score: 8,
            rater: { id: 'a1', firstname: 'Admin', lastname: 'One' },
            session: { id: 's1', date: new Date(), slot: 'AM' },
          },
          {
            id: 'r2',
            score: 7,
            rater: { id: 'a2', firstname: 'Admin', lastname: 'Two' },
            session: { id: 's2', date: new Date(), slot: 'PM' },
          },
        ],
      };

      mockRatingsService.getUserRatings.mockResolvedValue(expectedResult);

      const result = await controller.getUserRatings(userId);

      expect(result).toEqual(expectedResult);
      expect(mockRatingsService.getUserRatings).toHaveBeenCalledWith(
        userId,
        undefined,
        undefined,
      );
    });

    it('should return user ratings with date filter', async () => {
      const userId = 'user-1';
      const from = '2025-01-01';
      const to = '2025-12-31';
      const expectedResult = {
        average: 8.5,
        count: 1,
        ratings: [],
      };

      mockRatingsService.getUserRatings.mockResolvedValue(expectedResult);

      const result = await controller.getUserRatings(userId, from, to);

      expect(result).toEqual(expectedResult);
      expect(mockRatingsService.getUserRatings).toHaveBeenCalledWith(
        userId,
        from,
        to,
      );
    });
  });

  describe('deleteRating', () => {
    it('should delete a rating', async () => {
      const sessionId = 'session-1';
      const userId = 'user-1';
      const expectedResult = { message: 'Rating deleted successfully' };

      mockRatingsService.deleteRating.mockResolvedValue(expectedResult);

      const result = await controller.deleteRating(sessionId, userId);

      expect(result).toEqual(expectedResult);
      expect(mockRatingsService.deleteRating).toHaveBeenCalledWith(
        sessionId,
        userId,
      );
    });
  });
});
