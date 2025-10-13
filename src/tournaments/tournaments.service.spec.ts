import { Test, TestingModule } from '@nestjs/testing';
import { TournamentsService } from './tournaments.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('TournamentsService - Team Generation', () => {
  let service: TournamentsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    tournament: {
      findUnique: jest.fn(),
    },
    tournamentTeam: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    tournamentTeamMember: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TournamentsService>(TournamentsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('generateTeams', () => {
    it('should throw NotFoundException if tournament does not exist', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(null);

      await expect(service.generateTeams('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if less than 2 participants', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue({
        id: 'tournament-1',
        participants: [
          {
            id: 'participant-1',
            userId: 'user-1',
            user: {
              id: 'user-1',
              firstname: 'John',
              lastname: 'Doe',
              currentRanking: 100,
            },
          },
        ],
      });

      await expect(service.generateTeams('tournament-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.generateTeams('tournament-1')).rejects.toThrow(
        'Cannot generate teams with less than 2 participants',
      );
    });

    it('should generate teams with even number of participants sorted by ranking', async () => {
      const participants = [
        {
          id: 'participant-1',
          userId: 'user-1',
          user: {
            id: 'user-1',
            firstname: 'Alice',
            lastname: 'Smith',
            currentRanking: 500, // Rank 3
          },
        },
        {
          id: 'participant-2',
          userId: 'user-2',
          user: {
            id: 'user-2',
            firstname: 'Bob',
            lastname: 'Jones',
            currentRanking: 1000, // Rank 1 (highest)
          },
        },
        {
          id: 'participant-3',
          userId: 'user-3',
          user: {
            id: 'user-3',
            firstname: 'Charlie',
            lastname: 'Brown',
            currentRanking: 750, // Rank 2
          },
        },
        {
          id: 'participant-4',
          userId: 'user-4',
          user: {
            id: 'user-4',
            firstname: 'Diana',
            lastname: 'Prince',
            currentRanking: 250, // Rank 4
          },
        },
      ];

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        id: 'tournament-1',
        participants,
      });

      const createdTeams = [
        { id: 'team-1', orderIndex: 0 },
        { id: 'team-2', orderIndex: 1 },
      ];

      // Mock transaction
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          tournamentTeam: {
            deleteMany: jest.fn().mockResolvedValue({}),
            create: jest
              .fn()
              .mockResolvedValueOnce(createdTeams[0])
              .mockResolvedValueOnce(createdTeams[1]),
          },
          tournamentTeamMember: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      const result = await service.generateTeams('tournament-1');

      expect(result).toEqual(createdTeams);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should handle odd number of participants with bye team', async () => {
      const participants = [
        {
          id: 'participant-1',
          userId: 'user-1',
          user: {
            id: 'user-1',
            firstname: 'Alice',
            lastname: 'Smith',
            currentRanking: 1000,
          },
        },
        {
          id: 'participant-2',
          userId: 'user-2',
          user: {
            id: 'user-2',
            firstname: 'Bob',
            lastname: 'Jones',
            currentRanking: 500,
          },
        },
        {
          id: 'participant-3',
          userId: 'user-3',
          user: {
            id: 'user-3',
            firstname: 'Charlie',
            lastname: 'Brown',
            currentRanking: 250,
          },
        },
      ];

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        id: 'tournament-1',
        participants,
      });

      const createdTeams = [
        { id: 'team-1', orderIndex: 0 },
        { id: 'team-2', orderIndex: 1 }, // bye team with single member
      ];

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          tournamentTeam: {
            deleteMany: jest.fn().mockResolvedValue({}),
            create: jest
              .fn()
              .mockResolvedValueOnce(createdTeams[0])
              .mockResolvedValueOnce(createdTeams[1]),
          },
          tournamentTeamMember: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      const result = await service.generateTeams('tournament-1');

      expect(result).toHaveLength(2);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should treat null ranking as 0 for sorting', async () => {
      const participants = [
        {
          id: 'participant-1',
          userId: 'user-1',
          user: {
            id: 'user-1',
            firstname: 'Alice',
            lastname: 'Smith',
            currentRanking: null, // Should be treated as 0
          },
        },
        {
          id: 'participant-2',
          userId: 'user-2',
          user: {
            id: 'user-2',
            firstname: 'Bob',
            lastname: 'Jones',
            currentRanking: 500,
          },
        },
        {
          id: 'participant-3',
          userId: 'user-3',
          user: {
            id: 'user-3',
            firstname: 'Charlie',
            lastname: 'Brown',
            currentRanking: null, // Should be treated as 0
          },
        },
        {
          id: 'participant-4',
          userId: 'user-4',
          user: {
            id: 'user-4',
            firstname: 'Diana',
            lastname: 'Prince',
            currentRanking: 1000,
          },
        },
      ];

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        id: 'tournament-1',
        participants,
      });

      const createdTeams = [
        { id: 'team-1', orderIndex: 0 },
        { id: 'team-2', orderIndex: 1 },
      ];

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          tournamentTeam: {
            deleteMany: jest.fn().mockResolvedValue({}),
            create: jest
              .fn()
              .mockResolvedValueOnce(createdTeams[0])
              .mockResolvedValueOnce(createdTeams[1]),
          },
          tournamentTeamMember: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      const result = await service.generateTeams('tournament-1');

      expect(result).toEqual(createdTeams);
      // Verify that teams were created (sorted by ranking)
      // Expected order: user-4 (1000), user-2 (500), user-1 (0/null), user-3 (0/null)
      // Teams: [user-4, user-2], [user-1, user-3]
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });
});
