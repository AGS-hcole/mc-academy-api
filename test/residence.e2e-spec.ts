import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import * as bcrypt from 'bcryptjs';
import { DateTime } from 'luxon';

describe('Residence Endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userAccessToken: string;
  let adminAccessToken: string;
  let testUserId: string;
  let testAdminId: string;
  let testManorId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new PrismaExceptionFilter());

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    // Create AppSetting if not exists
    await prisma.appSetting.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        responseCutoffWeekday: 5,
        responseCutoffHourLocal: 18,
        publishWeekday: 6,
        publishHourLocal: 20,
        autogenWeekday: 5,
        autogenHourLocal: 0,
        residenceCutoffHourLocal: 12,
        residenceCutoffMinuteLocal: 0,
      },
      update: {},
    });

    // Create test user
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    const testUser = await prisma.user.create({
      data: {
        email: 'test-residence-user@example.com',
        firstname: 'Test',
        lastname: 'User',
        password: hashedPassword,
        role: 'user',
      },
    });
    testUserId = testUser.id;

    // Create test admin
    const testAdmin = await prisma.user.create({
      data: {
        email: 'test-residence-admin@example.com',
        firstname: 'Admin',
        lastname: 'User',
        password: hashedPassword,
        role: 'admin',
      },
    });
    testAdminId = testAdmin.id;

    // Sign in users
    const userSignIn = await request(app.getHttpServer())
      .post('/api/auth/sign-in')
      .send({
        email: 'test-residence-user@example.com',
        password: 'testpassword',
      });
    userAccessToken = userSignIn.body.accessToken;

    const adminSignIn = await request(app.getHttpServer())
      .post('/api/auth/sign-in')
      .send({
        email: 'test-residence-admin@example.com',
        password: 'testpassword',
      });
    adminAccessToken = adminSignIn.body.accessToken;
  });

  afterAll(async () => {
    // Clean up
    if (testManorId) {
      await prisma.residenceStay.deleteMany({
        where: { manorId: testManorId },
      });
      await prisma.manor.delete({ where: { id: testManorId } });
    }
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.user.delete({ where: { id: testAdminId } });
    await app.close();
  });

  describe('Manor Management (Admin only)', () => {
    it('should create a manor as admin', async () => {
      const manorData = {
        name: 'Test Manor',
        address: '123 Test Street',
        city: 'Test City',
        capacity: 20,
        enforceCapacity: true,
        isActive: true,
      };

      const response = await request(app.getHttpServer())
        .post('/api/residence/manors')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(manorData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Manor');
      expect(response.body.capacity).toBe(20);
      testManorId = response.body.id;
    });

    it('should fail to create a manor as regular user', async () => {
      const manorData = {
        name: 'Unauthorized Manor',
        capacity: 10,
        enforceCapacity: true,
        isActive: true,
      };

      await request(app.getHttpServer())
        .post('/api/residence/manors')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(manorData)
        .expect(403);
    });

    it('should get all manors as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/residence/manors')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should update a manor as admin', async () => {
      const updateData = {
        capacity: 25,
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/residence/manors/${testManorId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.capacity).toBe(25);
    });
  });

  describe('Residence Stays (User)', () => {
    it('should create a stay for a future date', async () => {
      const futureDate = DateTime.now()
        .setZone('Europe/Paris')
        .plus({ days: 5 })
        .toFormat('yyyy-MM-dd');

      const stayData = {
        manorId: testManorId,
        date: futureDate,
      };

      const response = await request(app.getHttpServer())
        .post('/api/residence/stays')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(stayData)
        .expect(201);

      expect(response.body.date).toBe(futureDate);
      expect(response.body.status).toBe('PLANNED');
      expect(response.body.userId).toBe(testUserId);
    });

    it('should get user stays', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/residence/stays/me')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should cancel a stay', async () => {
      const futureDate = DateTime.now()
        .setZone('Europe/Paris')
        .plus({ days: 5 })
        .toFormat('yyyy-MM-dd');

      const cancelData = {
        manorId: testManorId,
        date: futureDate,
      };

      const response = await request(app.getHttpServer())
        .post('/api/residence/stays/cancel')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(cancelData)
        .expect(200);

      expect(response.body.status).toBe('CANCELED');
    });

    it('should fail to create stay for past cutoff time (same day in morning)', async () => {
      // This test assumes it's run after noon Paris time
      // In a real scenario, we'd mock the time service
      const today = DateTime.now()
        .setZone('Europe/Paris')
        .toFormat('yyyy-MM-dd');

      const now = DateTime.now().setZone('Europe/Paris');

      // Only test if after cutoff (12:00)
      if (now.hour >= 12) {
        const stayData = {
          manorId: testManorId,
          date: today,
        };

        await request(app.getHttpServer())
          .post('/api/residence/stays')
          .set('Authorization', `Bearer ${userAccessToken}`)
          .send(stayData)
          .expect(403);
      }
    });

    it('should fail with invalid date format', async () => {
      const stayData = {
        manorId: testManorId,
        date: 'invalid-date', // Wrong format
      };

      await request(app.getHttpServer())
        .post('/api/residence/stays')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(stayData)
        .expect(400);
    });
  });

  describe('Residence Stays (Admin)', () => {
    it('should create a stay for another user as admin', async () => {
      const futureDate = DateTime.now()
        .setZone('Europe/Paris')
        .plus({ days: 10 })
        .toFormat('yyyy-MM-dd');

      const stayData = {
        manorId: testManorId,
        userId: testUserId,
        date: futureDate,
      };

      const response = await request(app.getHttpServer())
        .post('/api/residence/stays')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(stayData)
        .expect(201);

      expect(response.body.userId).toBe(testUserId);
      expect(response.body.createdByAdmin).toBe(true);
    });

    it('should get manor stays report as admin', async () => {
      const futureDate = DateTime.now()
        .setZone('Europe/Paris')
        .plus({ days: 10 })
        .toFormat('yyyy-MM-dd');

      const response = await request(app.getHttpServer())
        .get('/api/residence/stays')
        .query({ manorId: testManorId, date: futureDate })
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('manor');
      expect(response.body).toHaveProperty('date');
      expect(response.body).toHaveProperty('counts');
      expect(response.body).toHaveProperty('stays');
      expect(response.body.counts.planned).toBeGreaterThanOrEqual(0);
    });

    it('should fail to get report as regular user', async () => {
      const futureDate = DateTime.now()
        .setZone('Europe/Paris')
        .plus({ days: 10 })
        .toFormat('yyyy-MM-dd');

      await request(app.getHttpServer())
        .get('/api/residence/stays')
        .query({ manorId: testManorId, date: futureDate })
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(403);
    });
  });

  describe('Capacity Enforcement', () => {
    let smallManorId: string;

    beforeAll(async () => {
      // Create a small capacity manor
      const manor = await prisma.manor.create({
        data: {
          name: 'Small Test Manor',
          capacity: 1,
          enforceCapacity: true,
          isActive: true,
        },
      });
      smallManorId = manor.id;
    });

    afterAll(async () => {
      await prisma.residenceStay.deleteMany({
        where: { manorId: smallManorId },
      });
      await prisma.manor.delete({ where: { id: smallManorId } });
    });

    it('should enforce capacity when enforceCapacity=true', async () => {
      const futureDate = DateTime.now()
        .setZone('Europe/Paris')
        .plus({ days: 15 })
        .toFormat('yyyy-MM-dd');

      // Create first stay (should succeed)
      await request(app.getHttpServer())
        .post('/api/residence/stays')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ manorId: smallManorId, date: futureDate })
        .expect(201);

      // Create second user
      const hashedPassword = await bcrypt.hash('testpassword', 10);
      const user2 = await prisma.user.create({
        data: {
          email: 'test-user2@example.com',
          firstname: 'User',
          lastname: 'Two',
          password: hashedPassword,
          role: 'user',
        },
      });

      const user2SignIn = await request(app.getHttpServer())
        .post('/api/auth/sign-in')
        .send({
          email: 'test-user2@example.com',
          password: 'testpassword',
        });
      const user2Token = user2SignIn.body.accessToken;

      // Try to create second stay (should fail)
      await request(app.getHttpServer())
        .post('/api/residence/stays')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ manorId: smallManorId, date: futureDate })
        .expect(409);

      // Admin can force it
      await request(app.getHttpServer())
        .post('/api/residence/stays')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          manorId: smallManorId,
          userId: user2.id,
          date: futureDate,
          force: true,
        })
        .expect(201);

      // Clean up
      await prisma.user.delete({ where: { id: user2.id } });
    });
  });
});
