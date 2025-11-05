import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  GenerateTeamsDto,
  MoveParticipantDto,
  SwapParticipantsDto,
  ReorderTeamsRequestDto,
  TeamsResponseDto,
} from './dto';
import { ParticipationStatus, TournamentStatus } from '@prisma/client';

interface ParticipantWithRanking {
  id: string;
  userId: string;
  rankSnapshot: number | null;
  user: {
    id: string;
    firstname: string;
    lastname: string;
    currentRanking: number | null;
  };
}

@Injectable()
export class TournamentsTeamsService {
  constructor(private prisma: PrismaService) {}

  async listTeams(
    tournamentId: string,
    includeBench: boolean = false,
  ): Promise<TeamsResponseDto> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        teams: {
          orderBy: { orderIndex: 'asc' },
          include: {
            members: {
              include: {
                participant: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        firstname: true,
                        lastname: true,
                        currentRanking: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        participants: includeBench
          ? {
              where: { status: ParticipationStatus.CONFIRMED },
              include: {
                user: {
                  select: {
                    id: true,
                    firstname: true,
                    lastname: true,
                    currentRanking: true,
                  },
                },
                teamMemberships: true,
              },
            }
          : undefined,
      },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const teams = tournament.teams.map(team => ({
      id: team.id,
      orderIndex: team.orderIndex,
      locked: team.locked,
      placement: team.placement,
      notes: team.notes,
      members: team.members.map(m => ({
        memberId: m.id,
        participantId: m.participant.id,
        userId: m.participant.user.id,
        firstname: m.participant.user.firstname,
        lastname: m.participant.user.lastname,
        currentRanking: m.participant.user.currentRanking,
        rankSnapshot: m.participant.rankSnapshot,
      })),
    }));

    let bench: any[] = [];
    if (includeBench && tournament.participants) {
      // Find participants with no team membership
      bench = tournament.participants
        .filter(p => p.teamMemberships.length === 0)
        .map(p => ({
          participantId: p.id,
          userId: p.user.id,
          firstname: p.user.firstname,
          lastname: p.user.lastname,
          currentRanking: p.user.currentRanking,
          rankSnapshot: p.rankSnapshot,
        }));
    }

    return { teams, bench };
  }

  async generateTeams(
    tournamentId: string,
    dto: GenerateTeamsDto,
  ): Promise<TeamsResponseDto> {
    const {
      method = 'BALANCED',
      preserveLocked = true,
      clearExisting = true,
      randomSeed,
      teamSize = 2,
      allowOddParticipant = true,
      snapshotRanking = true,
    } = dto;

    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        participants: {
          where: { status: ParticipationStatus.CONFIRMED },
          include: {
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                currentRanking: true,
              },
            },
          },
        },
        teams: {
          include: {
            members: {
              include: {
                participant: true,
              },
            },
          },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.status === TournamentStatus.ARCHIVED) {
      throw new BadRequestException(
        'Cannot generate teams for archived tournament',
      );
    }

    console.log(tournament);

    if (tournament.participants.length < 2) {
      throw new BadRequestException(
        'Cannot generate teams with less than 2 confirmed participants',
      );
    }

    return this.prisma.$transaction(async tx => {
      // Snapshot rankings if requested
      if (snapshotRanking) {
        for (const participant of tournament.participants) {
          await tx.tournamentParticipant.update({
            where: { id: participant.id },
            data: { rankSnapshot: participant.user.currentRanking },
          });
        }
      }

      let lockedTeams: any[] = [];
      let lockedParticipantIds: string[] = [];

      if (preserveLocked) {
        lockedTeams = tournament.teams.filter(t => t.locked);
        lockedParticipantIds = lockedTeams.flatMap(t =>
          t.members.map(m => m.participantId),
        );
      }

      // Clear existing non-locked teams if requested
      if (clearExisting) {
        const teamsToDelete = tournament.teams.filter(
          t => !preserveLocked || !t.locked,
        );
        for (const team of teamsToDelete) {
          await tx.tournamentTeamMember.deleteMany({
            where: { teamId: team.id },
          });
          await tx.tournamentTeam.delete({
            where: { id: team.id },
          });
        }
      }

      // Get available participants (not in locked teams)
      const availableParticipants = tournament.participants.filter(
        p => !lockedParticipantIds.includes(p.id),
      );

      // Check for odd participants
      if (
        !allowOddParticipant &&
        availableParticipants.length % teamSize !== 0
      ) {
        throw new BadRequestException(
          `Odd number of participants (${availableParticipants.length}). Set allowOddParticipant=true or adjust participants.`,
        );
      }

      // Generate pairs based on method
      let pairs: string[][];
      if (method === 'RANDOM') {
        pairs = this.generateRandomPairs(
          availableParticipants,
          teamSize,
          randomSeed,
        );
      } else {
        pairs = this.generateBalancedPairs(availableParticipants, teamSize);
      }

      // Determine starting orderIndex (after locked teams)
      const maxLockedIndex =
        preserveLocked && lockedTeams.length > 0
          ? Math.max(...lockedTeams.map(t => t.orderIndex))
          : -1;
      let nextOrderIndex = maxLockedIndex + 1;

      // Create new teams
      for (const pair of pairs) {
        const team = await tx.tournamentTeam.create({
          data: {
            tournamentId,
            orderIndex: nextOrderIndex++,
            locked: false,
          },
        });

        for (const participantId of pair) {
          await tx.tournamentTeamMember.create({
            data: {
              teamId: team.id,
              participantId,
            },
          });
        }
      }

      // Return updated teams
      return this.listTeamsInTransaction(tx, tournamentId, true);
    });
  }

  async rebalanceTeams(
    tournamentId: string,
    dto: GenerateTeamsDto,
  ): Promise<TeamsResponseDto> {
    // Force preserveLocked and clearExisting
    return this.generateTeams(tournamentId, {
      ...dto,
      preserveLocked: true,
      clearExisting: true,
    });
  }

  async moveParticipant(
    tournamentId: string,
    dto: MoveParticipantDto,
  ): Promise<TeamsResponseDto> {
    return this.prisma.$transaction(async tx => {
      const participant = await tx.tournamentParticipant.findUnique({
        where: { id: dto.participantId },
        include: { teamMemberships: true },
      });

      if (!participant || participant.tournamentId !== tournamentId) {
        throw new NotFoundException('Participant not found in this tournament');
      }

      // Remove from current team
      if (participant.teamMemberships.length > 0) {
        const currentMembership = participant.teamMemberships[0];
        const currentTeam = await tx.tournamentTeam.findUnique({
          where: { id: currentMembership.teamId },
        });

        if (currentTeam?.locked) {
          throw new BadRequestException(
            'Cannot move participant from locked team',
          );
        }

        await tx.tournamentTeamMember.delete({
          where: { id: currentMembership.id },
        });
      }

      // Add to target team if specified
      if (dto.targetTeamId) {
        const targetTeam = await tx.tournamentTeam.findUnique({
          where: { id: dto.targetTeamId },
          include: { members: true },
        });

        if (!targetTeam || targetTeam.tournamentId !== tournamentId) {
          throw new NotFoundException('Target team not found');
        }

        if (targetTeam.locked) {
          throw new BadRequestException(
            'Cannot add participant to locked team',
          );
        }

        // Check team capacity (default 2)
        const teamSize = 2;
        if (targetTeam.members.length >= teamSize) {
          throw new BadRequestException(
            `Team is full (max ${teamSize} members)`,
          );
        }

        await tx.tournamentTeamMember.create({
          data: {
            teamId: dto.targetTeamId,
            participantId: dto.participantId,
          },
        });
      }

      return this.listTeamsInTransaction(tx, tournamentId, true);
    });
  }

  async swapParticipants(
    tournamentId: string,
    dto: SwapParticipantsDto,
  ): Promise<TeamsResponseDto> {
    return this.prisma.$transaction(async tx => {
      const [participantA, participantB] = await Promise.all([
        tx.tournamentParticipant.findUnique({
          where: { id: dto.participantIdA },
          include: { teamMemberships: true },
        }),
        tx.tournamentParticipant.findUnique({
          where: { id: dto.participantIdB },
          include: { teamMemberships: true },
        }),
      ]);

      if (
        !participantA ||
        !participantB ||
        participantA.tournamentId !== tournamentId ||
        participantB.tournamentId !== tournamentId
      ) {
        throw new NotFoundException(
          'One or both participants not found in this tournament',
        );
      }

      const membershipA = participantA.teamMemberships[0];
      const membershipB = participantB.teamMemberships[0];

      // Check if teams are locked
      if (membershipA) {
        const teamA = await tx.tournamentTeam.findUnique({
          where: { id: membershipA.teamId },
        });
        if (teamA?.locked) {
          throw new BadRequestException(
            'Cannot swap participant from locked team',
          );
        }
      }

      if (membershipB) {
        const teamB = await tx.tournamentTeam.findUnique({
          where: { id: membershipB.teamId },
        });
        if (teamB?.locked) {
          throw new BadRequestException(
            'Cannot swap participant from locked team',
          );
        }
      }

      // Remove both memberships
      if (membershipA) {
        await tx.tournamentTeamMember.delete({ where: { id: membershipA.id } });
      }
      if (membershipB) {
        await tx.tournamentTeamMember.delete({ where: { id: membershipB.id } });
      }

      // Create inverse memberships
      if (membershipA) {
        await tx.tournamentTeamMember.create({
          data: {
            teamId: membershipA.teamId,
            participantId: dto.participantIdB,
          },
        });
      }
      if (membershipB) {
        await tx.tournamentTeamMember.create({
          data: {
            teamId: membershipB.teamId,
            participantId: dto.participantIdA,
          },
        });
      }

      return this.listTeamsInTransaction(tx, tournamentId, true);
    });
  }

  async reorderTeams(
    tournamentId: string,
    dto: ReorderTeamsRequestDto,
  ): Promise<TeamsResponseDto> {
    return this.prisma.$transaction(async tx => {
      const tournament = await tx.tournament.findUnique({
        where: { id: tournamentId },
        include: { teams: true },
      });

      if (!tournament) {
        throw new NotFoundException('Tournament not found');
      }

      const teamIds = tournament.teams.map(t => t.id);

      // Verify all teams belong to tournament
      for (const item of dto.order) {
        if (!teamIds.includes(item.teamId)) {
          throw new BadRequestException(
            `Team ${item.teamId} not found in tournament`,
          );
        }
      }

      // Update order indices
      for (const item of dto.order) {
        await tx.tournamentTeam.update({
          where: { id: item.teamId },
          data: { orderIndex: item.orderIndex },
        });
      }

      return this.listTeamsInTransaction(tx, tournamentId, false);
    });
  }

  async setTeamLock(
    tournamentId: string,
    teamId: string,
    locked: boolean,
  ): Promise<void> {
    const team = await this.prisma.tournamentTeam.findUnique({
      where: { id: teamId },
    });

    if (!team || team.tournamentId !== tournamentId) {
      throw new NotFoundException('Team not found');
    }

    await this.prisma.tournamentTeam.update({
      where: { id: teamId },
      data: { locked },
    });
  }

  async clearTeams(
    tournamentId: string,
    preserveLocked: boolean = true,
  ): Promise<void> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { teams: true },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    await this.prisma.$transaction(async tx => {
      const teamsToDelete = tournament.teams.filter(
        t => !preserveLocked || !t.locked,
      );

      for (const team of teamsToDelete) {
        await tx.tournamentTeamMember.deleteMany({
          where: { teamId: team.id },
        });
        await tx.tournamentTeam.delete({
          where: { id: team.id },
        });
      }
    });
  }

  async addMember(
    tournamentId: string,
    teamId: string,
    participantId: string,
  ): Promise<TeamsResponseDto> {
    return this.prisma.$transaction(async tx => {
      const team = await tx.tournamentTeam.findUnique({
        where: { id: teamId },
        include: { members: true },
      });

      if (!team || team.tournamentId !== tournamentId) {
        throw new NotFoundException('Team not found');
      }

      if (team.locked) {
        throw new BadRequestException('Cannot add member to locked team');
      }

      const participant = await tx.tournamentParticipant.findUnique({
        where: { id: participantId },
      });

      if (!participant || participant.tournamentId !== tournamentId) {
        throw new NotFoundException('Participant not found in this tournament');
      }

      const teamSize = 2;
      if (team.members.length >= teamSize) {
        throw new BadRequestException(`Team is full (max ${teamSize} members)`);
      }

      await tx.tournamentTeamMember.create({
        data: {
          teamId,
          participantId,
        },
      });

      return this.listTeamsInTransaction(tx, tournamentId, true);
    });
  }

  async removeMember(
    tournamentId: string,
    teamId: string,
    memberId: string,
  ): Promise<TeamsResponseDto> {
    return this.prisma.$transaction(async tx => {
      const team = await tx.tournamentTeam.findUnique({
        where: { id: teamId },
      });

      if (!team || team.tournamentId !== tournamentId) {
        throw new NotFoundException('Team not found');
      }

      if (team.locked) {
        throw new BadRequestException('Cannot remove member from locked team');
      }

      const member = await tx.tournamentTeamMember.findUnique({
        where: { id: memberId },
      });

      if (!member || member.teamId !== teamId) {
        throw new NotFoundException('Member not found in this team');
      }

      await tx.tournamentTeamMember.delete({
        where: { id: memberId },
      });

      return this.listTeamsInTransaction(tx, tournamentId, true);
    });
  }

  // Private helper methods
  private generateBalancedPairs(
    participants: ParticipantWithRanking[],
    teamSize: number,
  ): string[][] {
    // Get effective ranking for each participant
    const getRank = (p: ParticipantWithRanking) =>
      p.rankSnapshot ?? p.user.currentRanking ?? 999999;

    // Sort by rank ascending (lower = stronger)
    const sorted = [...participants].sort((a, b) => getRank(a) - getRank(b));

    // Snake pairing: pair best with worst
    const pairs: string[][] = [];
    const n = sorted.length;

    for (let i = 0; i < Math.floor(n / teamSize); i++) {
      if (teamSize === 2) {
        // Pair p[i] with p[n-1-i]
        pairs.push([sorted[i].id, sorted[n - 1 - i].id]);
      } else {
        // For larger teams, take from both ends
        const team: string[] = [];
        for (let j = 0; j < teamSize; j++) {
          const idx = j % 2 === 0 ? i + j / 2 : n - 1 - i - Math.floor(j / 2);
          if (idx < n) {
            team.push(sorted[idx].id);
          }
        }
        if (team.length === teamSize) {
          pairs.push(team);
        }
      }
    }

    return pairs;
  }

  private generateRandomPairs(
    participants: ParticipantWithRanking[],
    teamSize: number,
    seed?: number,
  ): string[][] {
    const shuffled = [...participants];

    // Simple deterministic shuffle if seed provided
    if (seed !== undefined) {
      const random = this.seededRandom(seed);
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
    } else {
      // Regular random shuffle
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
    }

    // Group into teams
    const pairs: string[][] = [];
    for (let i = 0; i < shuffled.length; i += teamSize) {
      const team = shuffled.slice(i, i + teamSize).map(p => p.id);
      if (team.length === teamSize) {
        pairs.push(team);
      }
    }

    return pairs;
  }

  private seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
  }

  private async listTeamsInTransaction(
    tx: any,
    tournamentId: string,
    includeBench: boolean,
  ): Promise<TeamsResponseDto> {
    const tournament = await tx.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        teams: {
          orderBy: { orderIndex: 'asc' },
          include: {
            members: {
              include: {
                participant: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        firstname: true,
                        lastname: true,
                        currentRanking: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        participants: includeBench
          ? {
              where: { status: ParticipationStatus.CONFIRMED },
              include: {
                user: {
                  select: {
                    id: true,
                    firstname: true,
                    lastname: true,
                    currentRanking: true,
                  },
                },
                teamMemberships: true,
              },
            }
          : undefined,
      },
    });

    const teams = tournament.teams.map(team => ({
      id: team.id,
      orderIndex: team.orderIndex,
      locked: team.locked,
      placement: team.placement,
      notes: team.notes,
      members: team.members.map(m => ({
        memberId: m.id,
        participantId: m.participant.id,
        userId: m.participant.user.id,
        firstname: m.participant.user.firstname,
        lastname: m.participant.user.lastname,
        currentRanking: m.participant.user.currentRanking,
        rankSnapshot: m.participant.rankSnapshot,
      })),
    }));

    let bench: any[] = [];
    if (includeBench && tournament.participants) {
      bench = tournament.participants
        .filter(p => p.teamMemberships.length === 0)
        .map(p => ({
          participantId: p.id,
          userId: p.user.id,
          firstname: p.user.firstname,
          lastname: p.user.lastname,
          currentRanking: p.user.currentRanking,
          rankSnapshot: p.rankSnapshot,
        }));
    }

    return { teams, bench };
  }
}
