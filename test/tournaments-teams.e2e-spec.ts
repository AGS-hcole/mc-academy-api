import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Tournaments Teams (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let tournamentId: string;
  let participant1Id: string;
  let participant2Id: string;
  let participant3Id: string;
  let participant4Id: string;
  let user1Id: string;
  let user2Id: string;
  let user3Id: string;
  let user4Id: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Clean up existing test data
    await prisma.tournamentTeamMember.deleteMany({});
    await prisma.tournamentTeam.deleteMany({});
    await prisma.tournamentParticipant.deleteMany({});
    await prisma.tournament.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'admin-teams@test.com',
            'user1-teams@test.com',
            'user2-teams@test.com',
            'user3-teams@test.com',
            'user4-teams@test.com',
          ],
        },
      },
    });

    // Create admin user
    await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'admin-teams@test.com',
      password: 'Password123!',
      firstname: 'Admin',
      lastname: 'User',
      birthDate: '1990-01-01',
    });

    // Promote to admin
    await prisma.user.update({
      where: { email: 'admin-teams@test.com' },
      data: { role: 'admin' },
    });

    // Login as admin
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin-teams@test.com',
        password: 'Password123!',
      });

    adminToken = loginResponse.body.accessToken;

    // Create test users with rankings
    const user1 = await prisma.user.create({
      data: {
        email: 'user1-teams@test.com',
        password: 'Password123!',
        firstname: 'User',
        lastname: 'One',
        birthDate: new Date('1990-01-01'),
        currentRanking: 5,
      },
    });
    user1Id = user1.id;

    const user2 = await prisma.user.create({
      data: {
        email: 'user2-teams@test.com',
        password: 'Password123!',
        firstname: 'User',
        lastname: 'Two',
        birthDate: new Date('1990-01-01'),
        currentRanking: 15,
      },
    });
    user2Id = user2.id;

    const user3 = await prisma.user.create({
      data: {
        email: 'user3-teams@test.com',
        password: 'Password123!',
        firstname: 'User',
        lastname: 'Three',
        birthDate: new Date('1990-01-01'),
        currentRanking: 25,
      },
    });
    user3Id = user3.id;

    const user4 = await prisma.user.create({
      data: {
        email: 'user4-teams@test.com',
        password: 'Password123!',
        firstname: 'User',
        lastname: 'Four',
        birthDate: new Date('1990-01-01'),
        currentRanking: 35,
      },
    });
    user4Id = user4.id;

    // Create tournament
    const tournament = await prisma.tournament.create({
      data: {
        title: 'Test Teams Tournament',
        type: 'P1000',
        status: 'DRAFT',
        addressLine1: '123 Test St',
        postalCode: '12345',
        city: 'Test City',
        country: 'Test Country',
        startsAt: new Date('2025-12-01'),
        endsAt: new Date('2025-12-02'),
      },
    });
    tournamentId = tournament.id;

    // Add participants with CONFIRMED status
    const p1 = await prisma.tournamentParticipant.create({
      data: {
        tournamentId,
        userId: user1Id,
        status: 'CONFIRMED',
      },
    });
    participant1Id = p1.id;

    const p2 = await prisma.tournamentParticipant.create({
      data: {
        tournamentId,
        userId: user2Id,
        status: 'CONFIRMED',
      },
    });
    participant2Id = p2.id;

    const p3 = await prisma.tournamentParticipant.create({
      data: {
        tournamentId,
        userId: user3Id,
        status: 'CONFIRMED',
      },
    });
    participant3Id = p3.id;

    const p4 = await prisma.tournamentParticipant.create({
      data: {
        tournamentId,
        userId: user4Id,
        status: 'CONFIRMED',
      },
    });
    participant4Id = p4.id;
  });

  afterAll(async () => {
    await prisma.tournamentTeamMember.deleteMany({});
    await prisma.tournamentTeam.deleteMany({});
    await prisma.tournamentParticipant.deleteMany({});
    await prisma.tournament.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'admin-teams@test.com',
            'user1-teams@test.com',
            'user2-teams@test.com',
            'user3-teams@test.com',
            'user4-teams@test.com',
          ],
        },
      },
    });
    await app.close();
  });

  describe('POST /tournaments/:tournamentId/teams/generate', () => {
    it('should generate balanced teams', async () => {
      const response = await request(app.getHttpServer())
        .post(`/tournaments/${tournamentId}/teams/generate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          method: 'BALANCED',
          teamSize: 2,
          snapshotRanking: true,
        })
        .expect(201);

      expect(response.body.teams).toHaveLength(2);
      expect(response.body.teams[0].members).toHaveLength(2);
      expect(response.body.teams[1].members).toHaveLength(2);

      // Verify balanced pairing (best with worst): (5,35) and (15,25)
      const team1Members = response.body.teams[0].members;

      // Check that rankings are snapshotted
      team1Members.forEach(member => {
        expect(member.rankSnapshot).toBeDefined();
      });
    });

    it('should require admin authentication', async () => {
      await request(app.getHttpServer())
        .post(`/tournaments/${tournamentId}/teams/generate`)
        .send({ method: 'BALANCED' })
        .expect(401);
    });

    it('should reject archived tournaments', async () => {
      // Archive tournament
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { status: 'ARCHIVED' },
      });

      await request(app.getHttpServer())
        .post(`/tournaments/${tournamentId}/teams/generate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ method: 'BALANCED' })
        .expect(400);

      // Restore to DRAFT
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { status: 'DRAFT' },
      });
    });
  });

  describe('GET /tournaments/:tournamentId/teams', () => {
    beforeEach(async () => {
      // Clean teams before each test
      await prisma.tournamentTeamMember.deleteMany({
        where: { team: { tournamentId } },
      });
      await prisma.tournamentTeam.deleteMany({ where: { tournamentId } });
    });

    it('should list teams without bench by default', async () => {
      // Create teams first
      await request(app.getHttpServer())
        .post(`/tournaments/${tournamentId}/teams/generate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ method: 'BALANCED' })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/tournaments/${tournamentId}/teams`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.teams).toBeDefined();
      expect(response.body.bench).toHaveLength(0);
    });

    it('should include bench when requested', async () => {
      // Create only 1 team, leaving 2 participants on bench
      const team = await prisma.tournamentTeam.create({
        data: {
          tournamentId,
          orderIndex: 0,
        },
      });

      await prisma.tournamentTeamMember.createMany({
        data: [
          { teamId: team.id, participantId: participant1Id },
          { teamId: team.id, participantId: participant2Id },
        ],
      });

      const response = await request(app.getHttpServer())
        .get(`/tournaments/${tournamentId}/teams?includeBench=true`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.teams).toHaveLength(1);
      expect(response.body.bench).toHaveLength(2);
    });
  });

  describe('PATCH /tournaments/:tournamentId/teams/:teamId/lock', () => {
    let teamId: string;

    beforeEach(async () => {
      await prisma.tournamentTeamMember.deleteMany({
        where: { team: { tournamentId } },
      });
      await prisma.tournamentTeam.deleteMany({ where: { tournamentId } });

      const team = await prisma.tournamentTeam.create({
        data: { tournamentId, orderIndex: 0 },
      });
      teamId = team.id;
    });

    it('should lock a team', async () => {
      await request(app.getHttpServer())
        .patch(`/tournaments/${tournamentId}/teams/${teamId}/lock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ locked: true })
        .expect(200);

      const team = await prisma.tournamentTeam.findUnique({
        where: { id: teamId },
      });
      expect(team.locked).toBe(true);
    });

    it('should unlock a team', async () => {
      // First lock it
      await prisma.tournamentTeam.update({
        where: { id: teamId },
        data: { locked: true },
      });

      await request(app.getHttpServer())
        .patch(`/tournaments/${tournamentId}/teams/${teamId}/lock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ locked: false })
        .expect(200);

      const team = await prisma.tournamentTeam.findUnique({
        where: { id: teamId },
      });
      expect(team.locked).toBe(false);
    });
  });

  describe('PATCH /tournaments/:tournamentId/teams/move', () => {
    let team1Id: string;
    let team2Id: string;

    beforeEach(async () => {
      await prisma.tournamentTeamMember.deleteMany({
        where: { team: { tournamentId } },
      });
      await prisma.tournamentTeam.deleteMany({ where: { tournamentId } });

      const team1 = await prisma.tournamentTeam.create({
        data: { tournamentId, orderIndex: 0 },
      });
      team1Id = team1.id;

      const team2 = await prisma.tournamentTeam.create({
        data: { tournamentId, orderIndex: 1 },
      });
      team2Id = team2.id;

      // Add participant1 to team1
      await prisma.tournamentTeamMember.create({
        data: { teamId: team1Id, participantId: participant1Id },
      });

      // Add participant2 to team1
      await prisma.tournamentTeamMember.create({
        data: { teamId: team1Id, participantId: participant2Id },
      });
    });

    it('should move participant to another team', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/tournaments/${tournamentId}/teams/move`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          participantId: participant1Id,
          targetTeamId: team2Id,
        })
        .expect(200);

      expect(response.body.teams).toHaveLength(2);

      // Verify participant1 is now in team2
      const team2Members = response.body.teams.find(
        t => t.id === team2Id,
      ).members;
      expect(team2Members.some(m => m.participantId === participant1Id)).toBe(
        true,
      );
    });

    it('should not allow moving to locked team', async () => {
      // Lock team2
      await prisma.tournamentTeam.update({
        where: { id: team2Id },
        data: { locked: true },
      });

      await request(app.getHttpServer())
        .patch(`/tournaments/${tournamentId}/teams/move`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          participantId: participant1Id,
          targetTeamId: team2Id,
        })
        .expect(400);
    });

    it('should not allow moving to full team', async () => {
      // Fill team2
      await prisma.tournamentTeamMember.createMany({
        data: [
          { teamId: team2Id, participantId: participant3Id },
          { teamId: team2Id, participantId: participant4Id },
        ],
      });

      await request(app.getHttpServer())
        .patch(`/tournaments/${tournamentId}/teams/move`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          participantId: participant1Id,
          targetTeamId: team2Id,
        })
        .expect(400);
    });
  });

  describe('PATCH /tournaments/:tournamentId/teams/swap', () => {
    let team1Id: string;
    let team2Id: string;

    beforeEach(async () => {
      await prisma.tournamentTeamMember.deleteMany({
        where: { team: { tournamentId } },
      });
      await prisma.tournamentTeam.deleteMany({ where: { tournamentId } });

      const team1 = await prisma.tournamentTeam.create({
        data: { tournamentId, orderIndex: 0 },
      });
      team1Id = team1.id;

      const team2 = await prisma.tournamentTeam.create({
        data: { tournamentId, orderIndex: 1 },
      });
      team2Id = team2.id;

      await prisma.tournamentTeamMember.create({
        data: { teamId: team1Id, participantId: participant1Id },
      });

      await prisma.tournamentTeamMember.create({
        data: { teamId: team2Id, participantId: participant2Id },
      });
    });

    it('should swap two participants', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/tournaments/${tournamentId}/teams/swap`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          participantIdA: participant1Id,
          participantIdB: participant2Id,
        })
        .expect(200);

      // Verify swap
      const team1 = response.body.teams.find(t => t.id === team1Id);
      const team2 = response.body.teams.find(t => t.id === team2Id);

      expect(team1.members.some(m => m.participantId === participant2Id)).toBe(
        true,
      );
      expect(team2.members.some(m => m.participantId === participant1Id)).toBe(
        true,
      );
    });

    it('should not allow swap from locked team', async () => {
      await prisma.tournamentTeam.update({
        where: { id: team1Id },
        data: { locked: true },
      });

      await request(app.getHttpServer())
        .patch(`/tournaments/${tournamentId}/teams/swap`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          participantIdA: participant1Id,
          participantIdB: participant2Id,
        })
        .expect(400);
    });
  });

  describe('POST /tournaments/:tournamentId/teams/rebalance', () => {
    let team1Id: string;

    beforeEach(async () => {
      await prisma.tournamentTeamMember.deleteMany({
        where: { team: { tournamentId } },
      });
      await prisma.tournamentTeam.deleteMany({ where: { tournamentId } });

      // Create one locked team
      const team1 = await prisma.tournamentTeam.create({
        data: { tournamentId, orderIndex: 0, locked: true },
      });
      team1Id = team1.id;

      await prisma.tournamentTeamMember.createMany({
        data: [
          { teamId: team1Id, participantId: participant1Id },
          { teamId: team1Id, participantId: participant2Id },
        ],
      });
    });

    it('should preserve locked teams during rebalance', async () => {
      const response = await request(app.getHttpServer())
        .post(`/tournaments/${tournamentId}/teams/rebalance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ method: 'BALANCED' })
        .expect(201);

      // Should have 2 teams: 1 locked (original) + 1 new
      expect(response.body.teams).toHaveLength(2);

      const lockedTeam = response.body.teams.find(t => t.id === team1Id);
      expect(lockedTeam).toBeDefined();
      expect(lockedTeam.locked).toBe(true);
      expect(lockedTeam.members).toHaveLength(2);
    });
  });

  describe('DELETE /tournaments/:tournamentId/teams', () => {
    beforeEach(async () => {
      await prisma.tournamentTeamMember.deleteMany({
        where: { team: { tournamentId } },
      });
      await prisma.tournamentTeam.deleteMany({ where: { tournamentId } });
    });

    it('should clear non-locked teams', async () => {
      // Create locked and unlocked teams
      const lockedTeam = await prisma.tournamentTeam.create({
        data: { tournamentId, orderIndex: 0, locked: true },
      });
      await prisma.tournamentTeam.create({
        data: { tournamentId, orderIndex: 1, locked: false },
      });

      await request(app.getHttpServer())
        .delete(`/tournaments/${tournamentId}/teams?preserveLocked=true`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const remainingTeams = await prisma.tournamentTeam.findMany({
        where: { tournamentId },
      });

      expect(remainingTeams).toHaveLength(1);
      expect(remainingTeams[0].id).toBe(lockedTeam.id);
    });

    it('should clear all teams when preserveLocked is false', async () => {
      await prisma.tournamentTeam.createMany({
        data: [
          { tournamentId, orderIndex: 0, locked: true },
          { tournamentId, orderIndex: 1, locked: false },
        ],
      });

      await request(app.getHttpServer())
        .delete(`/tournaments/${tournamentId}/teams?preserveLocked=false`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const remainingTeams = await prisma.tournamentTeam.findMany({
        where: { tournamentId },
      });

      expect(remainingTeams).toHaveLength(0);
    });
  });

  describe('PATCH /tournaments/:tournamentId/teams/reorder', () => {
    let team1Id: string;
    let team2Id: string;

    beforeEach(async () => {
      await prisma.tournamentTeamMember.deleteMany({
        where: { team: { tournamentId } },
      });
      await prisma.tournamentTeam.deleteMany({ where: { tournamentId } });

      const team1 = await prisma.tournamentTeam.create({
        data: { tournamentId, orderIndex: 0 },
      });
      team1Id = team1.id;

      const team2 = await prisma.tournamentTeam.create({
        data: { tournamentId, orderIndex: 1 },
      });
      team2Id = team2.id;
    });

    it('should reorder teams', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/tournaments/${tournamentId}/teams/reorder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          order: [
            { teamId: team2Id, orderIndex: 0 },
            { teamId: team1Id, orderIndex: 1 },
          ],
        })
        .expect(200);

      expect(response.body.teams[0].id).toBe(team2Id);
      expect(response.body.teams[1].id).toBe(team1Id);
    });
  });
});
