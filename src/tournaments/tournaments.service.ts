import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  TournamentStatus,
  TournamentType,
  ParticipationStatus,
  Prisma,
} from '@prisma/client';
import {
  CreateTournamentDto,
  UpdateTournamentDto,
  ReplaceParticipantsDto,
  ReorderTeamsDto,
  UpdatePlacementDto,
} from './dto';
import { startOfDay } from 'date-fns';

@Injectable()
export class TournamentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTournamentDto) {
    return this.prisma.tournament.create({
      data: {
        title: dto.title,
        type: dto.type,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        postalCode: dto.postalCode,
        city: dto.city,
        country: dto.country,
        latitude: dto.latitude,
        longitude: dto.longitude,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
      },
    });
  }

  async findAll(filters?: {
    status?: TournamentStatus;
    type?: TournamentType;
    from?: Date;
    to?: Date;
    q?: string;
  }) {
    const where: Prisma.TournamentWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.from) {
      where.startsAt = {
        gte: filters.from,
      };
    }

    if (filters?.to) {
      where.endsAt = {
        lte: filters.to,
      };
    }

    if (filters?.q) {
      where.OR = [
        { title: { contains: filters.q, mode: 'insensitive' } },
        { city: { contains: filters.q, mode: 'insensitive' } },
        { country: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.tournament.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      include: {
        _count: {
          select: {
            participants: true,
            teams: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true,
                currentRanking: true,
                avatarData: true,
                avatarMime: true,
              },
            },
          },
          orderBy: { user: { lastname: 'asc' } },
        },
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
                        email: true,
                        currentRanking: true,
                        avatarData: true,
                        avatarMime: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    // Transform to include avatarUrl if data exists
    return {
      ...tournament,
      participants: tournament.participants.map(p => ({
        ...p,
        user: {
          ...p.user,
          displayName: `${p.user.firstname} ${p.user.lastname}`,
          avatarUrl:
            p.user.avatarData && p.user.avatarMime
              ? `data:${p.user.avatarMime};base64,${Buffer.from(p.user.avatarData).toString('base64')}`
              : null,
        },
      })),
      teams: tournament.teams.map(team => ({
        ...team,
        members: team.members.map(m => ({
          ...m,
          participant: {
            ...m.participant,
            user: {
              ...m.participant.user,
              displayName: `${m.participant.user.firstname} ${m.participant.user.lastname}`,
              avatarUrl:
                m.participant.user.avatarData && m.participant.user.avatarMime
                  ? `data:${m.participant.user.avatarMime};base64,${Buffer.from(m.participant.user.avatarData).toString('base64')}`
                  : null,
            },
          },
        })),
      })),
    };
  }

  async update(id: string, dto: UpdateTournamentDto) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    return this.prisma.tournament.update({
      where: { id },
      data: {
        title: dto.title,
        type: dto.type,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        postalCode: dto.postalCode,
        city: dto.city,
        country: dto.country,
        latitude: dto.latitude,
        longitude: dto.longitude,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
  }

  async delete(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.status !== TournamentStatus.DRAFT) {
      throw new BadRequestException(
        'Can only delete tournaments in DRAFT status',
      );
    }

    await this.prisma.tournament.delete({
      where: { id },
    });

    return { message: 'Tournament deleted successfully' };
  }

  async publish(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        participants: true,
        teams: true,
      },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.participants.length < 2) {
      throw new BadRequestException(
        'Cannot publish tournament with less than 2 participants',
      );
    }

    if (tournament.teams.length === 0) {
      throw new BadRequestException(
        'Cannot publish tournament without teams. Generate teams first.',
      );
    }

    return this.prisma.tournament.update({
      where: { id },
      data: { status: TournamentStatus.PUBLISHED },
    });
  }

  async archive(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    return this.prisma.tournament.update({
      where: { id },
      data: { status: TournamentStatus.ARCHIVED },
    });
  }

  async replaceParticipants(id: string, dto: ReplaceParticipantsDto) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    // Verify all users exist
    const users = await this.prisma.user.findMany({
      where: { id: { in: dto.userIds } },
    });

    if (users.length !== dto.userIds.length) {
      throw new BadRequestException('One or more user IDs are invalid');
    }

    // Use transaction to replace participants and clear teams
    return this.prisma.$transaction(async tx => {
      // Delete existing teams first (cascade will handle team members)
      await tx.tournamentTeamMember.deleteMany({
        where: { participant: { userId: { notIn: dto.userIds } } },
      });

      // Delete existing participants not in the new list
      await tx.tournamentParticipant.deleteMany({
        where: {
          tournamentId: id,
          userId: { notIn: dto.userIds },
        },
      });

      // Upsert new participants
      for (const userId of dto.userIds) {
        await tx.tournamentParticipant.upsert({
          where: {
            tournamentId_userId: {
              tournamentId: id,
              userId,
            },
          },
          update: {},
          create: {
            tournamentId: id,
            userId,
            status: ParticipationStatus.CONFIRMED,
          },
        });
      }

      return tx.tournament.findUnique({
        where: { id },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  firstname: true,
                  lastname: true,
                  email: true,
                  currentRanking: true,
                },
              },
            },
          },
        },
      });
    });
  }

  async generateTeams(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        participants: {
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
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.participants.length < 2) {
      throw new BadRequestException(
        'Cannot generate teams with less than 2 participants',
      );
    }

    // Sort participants by ranking (descending, nulls as 0)
    const sortedParticipants = tournament.participants.sort((a, b) => {
      const rankA = a.user.currentRanking ?? 0;
      const rankB = b.user.currentRanking ?? 0;
      return rankB - rankA;
    });

    return this.prisma.$transaction(async tx => {
      // Delete existing teams
      await tx.tournamentTeam.deleteMany({
        where: { tournamentId: id },
      });

      // Create teams by pairing adjacent participants
      const teams: any[] = [];
      for (let i = 0; i < sortedParticipants.length; i += 2) {
        const team = await tx.tournamentTeam.create({
          data: {
            tournamentId: id,
            orderIndex: Math.floor(i / 2),
          },
        });

        // Add first member
        await tx.tournamentTeamMember.create({
          data: {
            teamId: team.id,
            participantId: sortedParticipants[i].id,
          },
        });

        // Add second member if exists (handle odd number)
        if (i + 1 < sortedParticipants.length) {
          await tx.tournamentTeamMember.create({
            data: {
              teamId: team.id,
              participantId: sortedParticipants[i + 1].id,
            },
          });
        }

        teams.push(team);
      }

      return teams;
    });
  }

  async reorderTeams(id: string, dto: ReorderTeamsDto) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        teams: true,
      },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    // Verify all team IDs belong to this tournament
    const teamIds = tournament.teams.map(t => t.id);
    const invalidIds = dto.teamOrder.filter(id => !teamIds.includes(id));

    if (invalidIds.length > 0) {
      throw new BadRequestException('Invalid team IDs in order');
    }

    if (dto.teamOrder.length !== teamIds.length) {
      throw new BadRequestException('Team order must include all teams');
    }

    return this.prisma.$transaction(async tx => {
      for (let i = 0; i < dto.teamOrder.length; i++) {
        await tx.tournamentTeam.update({
          where: { id: dto.teamOrder[i] },
          data: { orderIndex: i },
        });
      }

      return tx.tournament.findUnique({
        where: { id },
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
        },
      });
    });
  }

  async updateTeamPlacement(
    tournamentId: string,
    teamId: string,
    dto: UpdatePlacementDto,
  ) {
    const team = await this.prisma.tournamentTeam.findUnique({
      where: { id: teamId },
    });

    if (!team || team.tournamentId !== tournamentId) {
      throw new NotFoundException('Team not found');
    }

    return this.prisma.tournamentTeam.update({
      where: { id: teamId },
      data: { placement: dto.placement },
    });
  }

  async rsvp(
    tournamentId: string,
    userId: string,
    status: 'CONFIRMED' | 'DECLINED',
  ) {
    const participant = await this.prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    return this.prisma.tournamentParticipant.update({
      where: { id: participant.id },
      data: {
        status:
          status === 'CONFIRMED'
            ? ParticipationStatus.CONFIRMED
            : ParticipationStatus.DECLINED,
      },
    });
  }

  async submitFeedback(tournamentId: string, userId: string, feedback: string) {
    const participant = await this.prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    return this.prisma.tournamentParticipant.update({
      where: { id: participant.id },
      data: { feedback },
    });
  }

  async findMyTournaments(
    userId: string,
    scope: 'upcoming' | 'past' | 'all' = 'all',
  ) {
    const today = startOfDay(new Date());

    const where: Prisma.TournamentWhereInput = {
      status: TournamentStatus.PUBLISHED,
      participants: {
        some: {
          userId,
        },
      },
    };

    if (scope === 'upcoming') {
      where.startsAt = { gte: today };
    } else if (scope === 'past') {
      where.endsAt = { lt: today };
    }

    return this.prisma.tournament.findMany({
      where,
      orderBy: { startsAt: 'desc' },
      include: {
        participants: {
          where: { userId },
          select: {
            id: true,
            status: true,
            feedback: true,
          },
        },
        _count: {
          select: {
            participants: true,
            teams: true,
          },
        },
      },
    });
  }
}
