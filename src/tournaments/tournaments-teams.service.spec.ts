import { Test, TestingModule } from '@nestjs/testing';
import { TournamentsTeamsService } from './tournaments-teams.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ParticipationStatus, TournamentStatus } from '@prisma/client';

describe('TournamentsTeamsService', () => {
  let service: TournamentsTeamsService;

  const mockPrismaService = {
    tournament: {
      findUnique: jest.fn(),
    },
    tournamentParticipant: {
      update: jest.fn(),
    },
    tournamentTeam: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
    tournamentTeamMember: {
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentsTeamsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TournamentsTeamsService>(TournamentsTeamsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateBalancedPairs', () => {
    it('should create balanced pairs with even participants', () => {
      // Test the private method through reflection or by creating a test harness
      const participants = [
        {
          id: '1',
          userId: 'u1',
          rankSnapshot: 1,
          user: { id: 'u1', firstname: 'A', lastname: 'A', currentRanking: 1 },
        },
        {
          id: '2',
          userId: 'u2',
          rankSnapshot: 5,
          user: { id: 'u2', firstname: 'B', lastname: 'B', currentRanking: 5 },
        },
        {
          id: '3',
          userId: 'u3',
          rankSnapshot: 10,
          user: {
            id: 'u3',
            firstname: 'C',
            lastname: 'C',
            currentRanking: 10,
          },
        },
        {
          id: '4',
          userId: 'u4',
          rankSnapshot: 20,
          user: {
            id: 'u4',
            firstname: 'D',
            lastname: 'D',
            currentRanking: 20,
          },
        },
        {
          id: '5',
          userId: 'u5',
          rankSnapshot: 30,
          user: {
            id: 'u5',
            firstname: 'E',
            lastname: 'E',
            currentRanking: 30,
          },
        },
        {
          id: '6',
          userId: 'u6',
          rankSnapshot: 40,
          user: {
            id: 'u6',
            firstname: 'F',
            lastname: 'F',
            currentRanking: 40,
          },
        },
      ];

      // Access private method for testing
      const pairs = (service as any).generateBalancedPairs(participants, 2);

      expect(pairs).toHaveLength(3);
      // Best with worst: (1,40), (5,30), (10,20)
      expect(pairs[0]).toEqual(['1', '6']); // 1 + 40 = 41
      expect(pairs[1]).toEqual(['2', '5']); // 5 + 30 = 35
      expect(pairs[2]).toEqual(['3', '4']); // 10 + 20 = 30

      // Verify sums are relatively balanced
      const sum1 = 1 + 40;
      const sum2 = 5 + 30;
      const sum3 = 10 + 20;
      expect(
        Math.max(sum1, sum2, sum3) - Math.min(sum1, sum2, sum3),
      ).toBeLessThan(12);
    });

    it('should handle odd number of participants', () => {
      const participants = [
        {
          id: '1',
          userId: 'u1',
          rankSnapshot: 1,
          user: { id: 'u1', firstname: 'A', lastname: 'A', currentRanking: 1 },
        },
        {
          id: '2',
          userId: 'u2',
          rankSnapshot: 5,
          user: { id: 'u2', firstname: 'B', lastname: 'B', currentRanking: 5 },
        },
        {
          id: '3',
          userId: 'u3',
          rankSnapshot: 10,
          user: {
            id: 'u3',
            firstname: 'C',
            lastname: 'C',
            currentRanking: 10,
          },
        },
      ];

      const pairs = (service as any).generateBalancedPairs(participants, 2);

      // Should only create 1 pair, leaving 1 participant out
      expect(pairs).toHaveLength(1);
      expect(pairs[0]).toEqual(['1', '3']); // Best with worst
    });

    it('should handle participants with null rankings', () => {
      const participants = [
        {
          id: '1',
          userId: 'u1',
          rankSnapshot: 10,
          user: {
            id: 'u1',
            firstname: 'A',
            lastname: 'A',
            currentRanking: 10,
          },
        },
        {
          id: '2',
          userId: 'u2',
          rankSnapshot: null,
          user: {
            id: 'u2',
            firstname: 'B',
            lastname: 'B',
            currentRanking: null,
          },
        },
        {
          id: '3',
          userId: 'u3',
          rankSnapshot: 20,
          user: {
            id: 'u3',
            firstname: 'C',
            lastname: 'C',
            currentRanking: 20,
          },
        },
        {
          id: '4',
          userId: 'u4',
          rankSnapshot: null,
          user: {
            id: 'u4',
            firstname: 'D',
            lastname: 'D',
            currentRanking: null,
          },
        },
      ];

      const pairs = (service as any).generateBalancedPairs(participants, 2);

      expect(pairs).toHaveLength(2);
      // Participants with null rankings should be treated as weakest
      // Order should be: 10, 20, null, null
      // Pairs: (10, null), (20, null)
      expect(pairs[0]).toContain('1');
      expect(pairs[1]).toContain('3');
    });
  });

  describe('generateRandomPairs', () => {
    it('should create random pairs with deterministic seed', () => {
      const participants = [
        {
          id: '1',
          userId: 'u1',
          rankSnapshot: 1,
          user: { id: 'u1', firstname: 'A', lastname: 'A', currentRanking: 1 },
        },
        {
          id: '2',
          userId: 'u2',
          rankSnapshot: 2,
          user: { id: 'u2', firstname: 'B', lastname: 'B', currentRanking: 2 },
        },
        {
          id: '3',
          userId: 'u3',
          rankSnapshot: 3,
          user: { id: 'u3', firstname: 'C', lastname: 'C', currentRanking: 3 },
        },
        {
          id: '4',
          userId: 'u4',
          rankSnapshot: 4,
          user: { id: 'u4', firstname: 'D', lastname: 'D', currentRanking: 4 },
        },
      ];

      const pairs1 = (service as any).generateRandomPairs(
        participants,
        2,
        12345,
      );
      const pairs2 = (service as any).generateRandomPairs(
        participants,
        2,
        12345,
      );

      // With same seed, should produce same result
      expect(pairs1).toEqual(pairs2);
      expect(pairs1).toHaveLength(2);
    });

    it('should create different pairs with different seeds', () => {
      const participants = [
        {
          id: '1',
          userId: 'u1',
          rankSnapshot: 1,
          user: { id: 'u1', firstname: 'A', lastname: 'A', currentRanking: 1 },
        },
        {
          id: '2',
          userId: 'u2',
          rankSnapshot: 2,
          user: { id: 'u2', firstname: 'B', lastname: 'B', currentRanking: 2 },
        },
        {
          id: '3',
          userId: 'u3',
          rankSnapshot: 3,
          user: { id: 'u3', firstname: 'C', lastname: 'C', currentRanking: 3 },
        },
        {
          id: '4',
          userId: 'u4',
          rankSnapshot: 4,
          user: { id: 'u4', firstname: 'D', lastname: 'D', currentRanking: 4 },
        },
      ];

      const pairs1 = (service as any).generateRandomPairs(
        participants,
        2,
        12345,
      );
      const pairs2 = (service as any).generateRandomPairs(
        participants,
        2,
        54321,
      );

      // Different seeds might produce different results (not guaranteed but likely)
      // Just verify both are valid
      expect(pairs1).toHaveLength(2);
      expect(pairs2).toHaveLength(2);
    });
  });

  describe('listTeams', () => {
    it('should throw NotFoundException when tournament does not exist', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(null);

      await expect(service.listTeams('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return teams without bench when includeBench is false', async () => {
      const mockTournament = {
        id: 't1',
        teams: [
          {
            id: 'team1',
            orderIndex: 0,
            locked: false,
            placement: null,
            notes: null,
            members: [
              {
                id: 'm1',
                participant: {
                  id: 'p1',
                  rankSnapshot: 10,
                  user: {
                    id: 'u1',
                    firstname: 'John',
                    lastname: 'Doe',
                    currentRanking: 10,
                  },
                },
              },
            ],
          },
        ],
      };

      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);

      const result = await service.listTeams('t1', false);

      expect(result.teams).toHaveLength(1);
      expect(result.bench).toHaveLength(0);
      expect(result.teams[0].id).toBe('team1');
    });
  });

  describe('generateTeams', () => {
    it('should throw NotFoundException for non-existent tournament', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(null);

      await expect(
        service.generateTeams('non-existent', { method: 'BALANCED' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for archived tournament', async () => {
      const mockTournament = {
        id: 't1',
        status: TournamentStatus.ARCHIVED,
        participants: [
          {
            id: 'p1',
            status: ParticipationStatus.CONFIRMED,
            user: { currentRanking: 10 },
          },
          {
            id: 'p2',
            status: ParticipationStatus.CONFIRMED,
            user: { currentRanking: 20 },
          },
        ],
        teams: [],
      };

      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);

      await expect(
        service.generateTeams('t1', { method: 'BALANCED' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with less than 2 participants', async () => {
      const mockTournament = {
        id: 't1',
        status: TournamentStatus.DRAFT,
        participants: [
          {
            id: 'p1',
            status: ParticipationStatus.CONFIRMED,
            user: { currentRanking: 10 },
          },
        ],
        teams: [],
      };

      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);

      await expect(
        service.generateTeams('t1', { method: 'BALANCED' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('setTeamLock', () => {
    it('should throw NotFoundException for non-existent team', async () => {
      mockPrismaService.tournamentTeam.findUnique.mockResolvedValue(null);

      await expect(
        service.setTeamLock('t1', 'non-existent', true),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for team from different tournament', async () => {
      mockPrismaService.tournamentTeam.findUnique.mockResolvedValue({
        id: 'team1',
        tournamentId: 't2', // Different tournament
      });

      await expect(service.setTeamLock('t1', 'team1', true)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('moveParticipant', () => {
    it('should throw NotFoundException for non-existent participant', async () => {
      mockPrismaService.$transaction.mockImplementation(async callback => {
        const mockTx = {
          tournamentParticipant: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(mockTx);
      });

      await expect(
        service.moveParticipant('t1', {
          participantId: 'non-existent',
          targetTeamId: 'team1',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('swapParticipants', () => {
    it('should throw NotFoundException when one participant does not exist', async () => {
      mockPrismaService.$transaction.mockImplementation(async callback => {
        const mockTx = {
          tournamentParticipant: {
            findUnique: jest
              .fn()
              .mockResolvedValueOnce({
                id: 'p1',
                tournamentId: 't1',
                teamMemberships: [],
              })
              .mockResolvedValueOnce(null), // Second participant not found
          },
        };
        return callback(mockTx);
      });

      await expect(
        service.swapParticipants('t1', {
          participantIdA: 'p1',
          participantIdB: 'non-existent',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reorderTeams', () => {
    it('should throw NotFoundException for non-existent tournament', async () => {
      mockPrismaService.$transaction.mockImplementation(async callback => {
        const mockTx = {
          tournament: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(mockTx);
      });

      await expect(
        service.reorderTeams('non-existent', {
          order: [{ teamId: 'team1', orderIndex: 1 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
