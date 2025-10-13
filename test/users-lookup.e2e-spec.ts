import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import * as bcrypt from 'bcryptjs';

describe('Users Lookup Endpoint (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminAccessToken: string;
  let userAccessToken: string;
  let testAdminId: string;
  let testUserId: string;
  const testUserIds: string[] = [];

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

    // Create test admin user
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    const testAdmin = await prisma.user.create({
      data: {
        email: 'test-admin-lookup@example.com',
        firstname: 'Admin',
        lastname: 'User',
        password: hashedPassword,
        role: 'admin',
      },
    });
    testAdminId = testAdmin.id;
    testUserIds.push(testAdminId);

    // Create test regular user
    const testUser = await prisma.user.create({
      data: {
        email: 'test-user-lookup@example.com',
        firstname: 'Regular',
        lastname: 'User',
        password: hashedPassword,
        role: 'user',
      },
    });
    testUserId = testUser.id;
    testUserIds.push(testUserId);

    // Create additional test users for search/pagination
    const additionalUsers = await Promise.all([
      prisma.user.create({
        data: {
          email: 'john.doe@example.com',
          firstname: 'John',
          lastname: 'Doe',
          password: hashedPassword,
          role: 'user',
        },
      }),
      prisma.user.create({
        data: {
          email: 'jane.smith@example.com',
          firstname: 'Jane',
          lastname: 'Smith',
          password: hashedPassword,
          role: 'user',
        },
      }),
      prisma.user.create({
        data: {
          email: 'bob.johnson@example.com',
          firstname: 'Bob',
          lastname: 'Johnson',
          password: hashedPassword,
          role: 'admin',
        },
      }),
    ]);
    testUserIds.push(...additionalUsers.map(u => u.id));

    // Sign in as admin to get access token
    const adminSignInResponse = await request(app.getHttpServer())
      .post('/api/auth/sign-in')
      .send({
        email: 'test-admin-lookup@example.com',
        password: 'testpassword',
      });
    adminAccessToken = adminSignInResponse.body.accessToken;

    // Sign in as regular user to get access token
    const userSignInResponse = await request(app.getHttpServer())
      .post('/api/auth/sign-in')
      .send({
        email: 'test-user-lookup@example.com',
        password: 'testpassword',
      });
    userAccessToken = userSignInResponse.body.accessToken;
  });

  afterAll(async () => {
    // Clean up all test users
    await prisma.user.deleteMany({
      where: {
        id: {
          in: testUserIds,
        },
      },
    });
    await app.close();
  });

  describe('GET /api/users/lookup', () => {
    it('should return all users without filters (admin)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/lookup')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('pageSize');
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(20);
      expect(response.body.total).toBeGreaterThanOrEqual(5);
    });

    it('should filter users by role=user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/lookup?role=user')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.items.length).toBeGreaterThan(0);
      response.body.items.forEach((user: any) => {
        expect(user.role).toBe('user');
      });
    });

    it('should filter users by role=admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/lookup?role=admin')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.items.length).toBeGreaterThan(0);
      response.body.items.forEach((user: any) => {
        expect(user.role).toBe('admin');
      });
    });

    it('should search users by firstname', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/lookup?search=John')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.items.length).toBeGreaterThan(0);
      const found = response.body.items.some(
        (user: any) =>
          user.firstname.toLowerCase().includes('john') ||
          user.lastname.toLowerCase().includes('john') ||
          user.email.toLowerCase().includes('john'),
      );
      expect(found).toBe(true);
    });

    it('should search users by email', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/lookup?search=jane.smith')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.items.length).toBeGreaterThan(0);
      const found = response.body.items.some((user: any) =>
        user.email.includes('jane.smith'),
      );
      expect(found).toBe(true);
    });

    it('should combine role and search filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/lookup?role=user&search=john')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.items.length).toBeGreaterThan(0);
      response.body.items.forEach((user: any) => {
        expect(user.role).toBe('user');
      });
    });

    it('should handle pagination with page parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/lookup?page=1&pageSize=2')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(2);
      expect(response.body.items.length).toBeLessThanOrEqual(2);
    });

    it('should handle pagination with different pageSize', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/lookup?pageSize=3')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.pageSize).toBe(3);
      expect(response.body.items.length).toBeLessThanOrEqual(3);
    });

    it('should use default values when no parameters provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/lookup')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(20);
    });

    it('should return user object with required fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/lookup?pageSize=1')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.items.length).toBeGreaterThan(0);
      const user = response.body.items[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('firstname');
      expect(user).toHaveProperty('lastname');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('role');
    });

    it('should return 403 for non-admin users', async () => {
      await request(app.getHttpServer())
        .get('/api/users/lookup')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(403);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/api/users/lookup').expect(401);
    });

    it('should handle empty search results', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/lookup?search=nonexistentuser12345')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.items).toEqual([]);
      expect(response.body.total).toBe(0);
    });
  });
});
