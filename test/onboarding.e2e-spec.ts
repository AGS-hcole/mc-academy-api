import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import * as bcrypt from 'bcryptjs';

describe('Onboarding Endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let testUserId: string;

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

    // Create a test user
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    const testUser = await prisma.user.create({
      data: {
        email: 'test-onboarding@example.com',
        firstname: 'Test',
        lastname: 'User',
        password: hashedPassword,
        role: 'user',
      },
    });
    testUserId = testUser.id;

    // Sign in to get access token
    const signInResponse = await request(app.getHttpServer())
      .post('/api/auth/sign-in')
      .send({
        email: 'test-onboarding@example.com',
        password: 'testpassword',
      });

    accessToken = signInResponse.body.accessToken;
  });

  afterAll(async () => {
    // Clean up test user
    await prisma.user.delete({ where: { id: testUserId } });
    await app.close();
  });

  describe('GET /api/auth/me', () => {
    it('should return user with mustOnboard=true when onboarding incomplete', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('mustOnboard');
      expect(response.body.user.email).toBe('test-onboarding@example.com');
      expect(response.body.mustOnboard).toBe(true); // No privacy consent or formula set
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });
  });

  describe('PUT /api/users/me', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        firstname: 'Hubert',
        lastname: 'Cole',
        phone: '+33611223344',
        birthDate: '1991-05-20',
        formula: 'FULL',
        notifyEmail: true,
        notifySMS: false,
        notifyWhatsApp: false,
      };

      const response = await request(app.getHttpServer())
        .put('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.firstname).toBe('Hubert');
      expect(response.body.lastname).toBe('Cole');
      expect(response.body.formula).toBe('FULL');
    });

    it('should return 409 for duplicate FFT license number', async () => {
      // Create another user with a license number
      const hashedPassword = await bcrypt.hash('testpassword', 10);
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          firstname: 'Other',
          lastname: 'User',
          password: hashedPassword,
          role: 'user',
          fftLicenseNumber: 'FFT-DUPLICATE',
        },
      });

      // Try to update current user with same license number
      const response = await request(app.getHttpServer())
        .put('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ fftLicenseNumber: 'FFT-DUPLICATE' })
        .expect(409);

      expect(response.body.code).toBe('FFT_LICENSE_TAKEN');

      // Clean up
      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it('should validate phone number format', async () => {
      await request(app.getHttpServer())
        .put('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ phone: 'invalid-phone' })
        .expect(400);
    });

    it('should validate birthDate is in the past', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      await request(app.getHttpServer())
        .put('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ birthDate: futureDate.toISOString() })
        .expect(400);
    });
  });

  describe('PUT /api/users/me/consents', () => {
    it('should update consents successfully', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/users/me/consents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          privacyConsent: true,
          photoConsent: true,
          marketingConsent: false,
        })
        .expect(200);

      expect(response.body.ok).toBe(true);

      // Verify consents were set
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: {
          privacyConsentAt: true,
          photoConsentAt: true,
          marketingConsentAt: true,
        },
      });

      expect(user.privacyConsentAt).toBeDefined();
      expect(user.photoConsentAt).toBeDefined();
      expect(user.marketingConsentAt).toBeNull();
    });

    it('should require privacyConsent field', async () => {
      await request(app.getHttpServer())
        .put('/api/users/me/consents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          photoConsent: true,
        })
        .expect(400);
    });
  });

  describe('POST /api/users/me/avatar', () => {
    it('should upload avatar successfully', async () => {
      // Create a small test image buffer (1x1 PNG)
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      );

      const response = await request(app.getHttpServer())
        .post('/api/users/me/avatar')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testImageBuffer, {
          filename: 'test.png',
          contentType: 'image/png',
        })
        .expect(200);

      expect(response.body.ok).toBe(true);
    });

    it('should reject invalid file types', async () => {
      const testBuffer = Buffer.from('test data');

      await request(app.getHttpServer())
        .post('/api/users/me/avatar')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testBuffer, {
          filename: 'test.txt',
          contentType: 'text/plain',
        })
        .expect(400);
    });
  });

  describe('POST /api/users/me/background', () => {
    it('should upload background successfully', async () => {
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      );

      const response = await request(app.getHttpServer())
        .post('/api/users/me/background')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testImageBuffer, {
          filename: 'test.png',
          contentType: 'image/png',
        })
        .expect(200);

      expect(response.body.ok).toBe(true);
    });
  });

  describe('GET /api/users/me/avatar', () => {
    it('should get avatar after upload', async () => {
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      );

      // Upload first
      await request(app.getHttpServer())
        .post('/api/users/me/avatar')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testImageBuffer, {
          filename: 'test.png',
          contentType: 'image/png',
        });

      // Get avatar
      const response = await request(app.getHttpServer())
        .get('/api/users/me/avatar')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('image');
    });
  });

  describe('GET /api/metadata/formulas', () => {
    it('should return formula enum values', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/metadata/formulas')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.items).toEqual(['MORNING', 'AFTERNOON', 'FULL']);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/metadata/formulas')
        .expect(401);
    });
  });

  describe('Complete onboarding flow', () => {
    it('should have mustOnboard=false after completing onboarding', async () => {
      // 1. Update profile
      await request(app.getHttpServer())
        .put('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstname: 'Complete',
          lastname: 'User',
          formula: 'FULL',
        });

      // 2. Accept consents
      await request(app.getHttpServer())
        .put('/api/users/me/consents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          privacyConsent: true,
        });

      // 3. Check mustOnboard is now false
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.mustOnboard).toBe(false);
    });
  });
});
