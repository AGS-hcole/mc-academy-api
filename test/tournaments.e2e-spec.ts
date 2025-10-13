import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Tournaments (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let userToken: string;
  let adminUser: any;
  let regularUser: any;
  let tournamentId: string;

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
          in: ['admin-tournament@test.com', 'user-tournament@test.com'],
        },
      },
    });

    // Create admin user
    const adminSignup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'admin-tournament@test.com',
        password: 'Password123!',
        firstname: 'Admin',
        lastname: 'User',
      });

    // Manually set admin role
    adminUser = await prisma.user.update({
      where: { email: 'admin-tournament@test.com' },
      data: { role: 'admin', currentRanking: 1000 },
    });

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin-tournament@test.com',
        password: 'Password123!',
      });

    adminToken = adminLogin.body.accessToken;

    // Create regular user
    await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'user-tournament@test.com',
      password: 'Password123!',
      firstname: 'Regular',
      lastname: 'User',
    });

    regularUser = await prisma.user.update({
      where: { email: 'user-tournament@test.com' },
      data: { currentRanking: 500 },
    });

    const userLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'user-tournament@test.com',
        password: 'Password123!',
      });

    userToken = userLogin.body.accessToken;
  });

  afterAll(async () => {
    // Clean up
    await prisma.tournamentTeamMember.deleteMany({});
    await prisma.tournamentTeam.deleteMany({});
    await prisma.tournamentParticipant.deleteMany({});
    await prisma.tournament.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['admin-tournament@test.com', 'user-tournament@test.com'],
        },
      },
    });
    await app.close();
  });

  describe('Admin Endpoints', () => {
    it('should create a tournament as admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/tournaments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Tournament',
          type: 'P1000',
          addressLine1: '123 Test Street',
          postalCode: '75001',
          city: 'Paris',
          country: 'France',
          startsAt: '2025-12-01T10:00:00Z',
          endsAt: '2025-12-01T18:00:00Z',
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Test Tournament');
      expect(response.body.status).toBe('DRAFT');
      tournamentId = response.body.id;
    });

    it('should not allow regular user to create tournament', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/tournaments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Unauthorized Tournament',
          type: 'P500',
          addressLine1: '456 Test Ave',
          postalCode: '75002',
          city: 'Paris',
          country: 'France',
          startsAt: '2025-12-02T10:00:00Z',
          endsAt: '2025-12-02T18:00:00Z',
        });

      expect(response.status).toBe(403);
    });

    it('should add participants to tournament', async () => {
      const response = await request(app.getHttpServer())
        .put(`/v1/tournaments/${tournamentId}/participants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userIds: [adminUser.id, regularUser.id],
        });

      expect(response.status).toBe(200);
      expect(response.body.participants).toHaveLength(2);
    });

    it('should generate teams for tournament', async () => {
      const response = await request(app.getHttpServer())
        .post(`/v1/tournaments/${tournamentId}/generate-teams`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(201);
      expect(response.body).toHaveLength(1); // One team with 2 members
    });

    it('should not publish tournament without teams', async () => {
      // Create new tournament without teams
      const createResponse = await request(app.getHttpServer())
        .post('/v1/tournaments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'No Teams Tournament',
          type: 'P250',
          addressLine1: '789 Test Blvd',
          postalCode: '75003',
          city: 'Paris',
          country: 'France',
          startsAt: '2025-12-03T10:00:00Z',
          endsAt: '2025-12-03T18:00:00Z',
        });

      const noTeamsTournamentId = createResponse.body.id;

      // Add participants
      await request(app.getHttpServer())
        .put(`/v1/tournaments/${noTeamsTournamentId}/participants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userIds: [adminUser.id, regularUser.id],
        });

      // Try to publish without generating teams
      const response = await request(app.getHttpServer())
        .put(`/v1/tournaments/${noTeamsTournamentId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('without teams');
    });

    it('should publish tournament with teams', async () => {
      const response = await request(app.getHttpServer())
        .put(`/v1/tournaments/${tournamentId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('PUBLISHED');
    });

    it('should not delete published tournament', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/v1/tournaments/${tournamentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('DRAFT');
    });
  });

  describe('User RSVP', () => {
    it('should allow user to confirm participation', async () => {
      const response = await request(app.getHttpServer())
        .put(`/v1/tournaments/${tournamentId}/rsvp`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          status: 'CONFIRMED',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('CONFIRMED');
    });

    it('should allow user to decline participation', async () => {
      const response = await request(app.getHttpServer())
        .put(`/v1/tournaments/${tournamentId}/rsvp`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          status: 'DECLINED',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('DECLINED');
    });

    it('should not allow RSVP without authentication', async () => {
      const response = await request(app.getHttpServer())
        .put(`/v1/tournaments/${tournamentId}/rsvp`)
        .send({
          status: 'CONFIRMED',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('User Feedback', () => {
    it('should allow user to submit feedback', async () => {
      const response = await request(app.getHttpServer())
        .put(`/v1/tournaments/${tournamentId}/feedback`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          feedback: 'Great tournament, really enjoyed it!',
        });

      expect(response.status).toBe(200);
      expect(response.body.feedback).toBe('Great tournament, really enjoyed it!');
    });

    it('should not allow feedback without authentication', async () => {
      const response = await request(app.getHttpServer())
        .put(`/v1/tournaments/${tournamentId}/feedback`)
        .send({
          feedback: 'Unauthorized feedback',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('My Tournaments', () => {
    it('should list user tournaments', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/my/tournaments')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(tournamentId);
    });

    it('should filter upcoming tournaments', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/my/tournaments?scope=upcoming')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should not allow accessing my tournaments without authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        '/v1/my/tournaments',
      );

      expect(response.status).toBe(401);
    });
  });

  describe('Team Management', () => {
    it('should allow admin to update team placement', async () => {
      // Get tournament with teams
      const tournamentResponse = await request(app.getHttpServer())
        .get(`/v1/tournaments/${tournamentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const teamId = tournamentResponse.body.teams[0].id;

      const response = await request(app.getHttpServer())
        .put(`/v1/tournaments/${tournamentId}/teams/${teamId}/placement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          placement: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.placement).toBe(1);
    });

    it('should not allow user to update team placement', async () => {
      const tournamentResponse = await request(app.getHttpServer())
        .get(`/v1/tournaments/${tournamentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const teamId = tournamentResponse.body.teams[0].id;

      const response = await request(app.getHttpServer())
        .put(`/v1/tournaments/${tournamentId}/teams/${teamId}/placement`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          placement: 2,
        });

      expect(response.status).toBe(403);
    });
  });
});
