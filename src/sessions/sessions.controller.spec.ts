import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthGuard } from '../auth/guards/auth.guards';
import { TrainingGroupsService } from '../training-groups/training-groups.service';
import { SessionsController } from './sessions.controller';
import { SessionsCron } from './sessions.cron';
import { SessionsService } from './sessions.service';

describe('SessionsController trigger-reapply', () => {
  let app: INestApplication;
  const trainingGroups = { applyToSessionsInRange: jest.fn() };
  const cron = { generateSessions: jest.fn(), publishSessions: jest.fn() };
  const period = { startDate: '2026-10-12', endDate: '2026-10-18' };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [SessionsController],
      providers: [
        { provide: SessionsService, useValue: {} },
        { provide: SessionsCron, useValue: cron },
        { provide: TrainingGroupsService, useValue: trainingGroups },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: context => {
          const req = context.switchToHttp().getRequest();
          const role = req.headers['x-test-role'];
          if (!role) throw new UnauthorizedException();
          req.user = { role };
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    trainingGroups.applyToSessionsInRange.mockResolvedValue({
      groups: 1,
      candidates: 2,
      created: 1,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('reapplies the inclusive range and returns the counts without generating sessions', async () => {
    const response = await request(app.getHttpServer())
      .post('/sessions/trigger-reapply')
      .set('x-test-role', 'admin')
      .send(period)
      .expect(200);

    expect(response.body).toEqual({ groups: 1, candidates: 2, created: 1 });
    expect(trainingGroups.applyToSessionsInRange).toHaveBeenCalledWith(
      new Date('2026-10-12T00:00:00.000Z'),
      new Date('2026-10-18T00:00:00.000Z'),
    );
    expect(cron.generateSessions).not.toHaveBeenCalled();
    expect(cron.publishSessions).not.toHaveBeenCalled();
  });

  it('accepts a single-day range', async () => {
    await request(app.getHttpServer())
      .post('/sessions/trigger-reapply')
      .set('x-test-role', 'admin')
      .send({ startDate: period.startDate, endDate: period.startDate })
      .expect(200);
  });

  it.each([
    {},
    { startDate: period.startDate },
    { ...period, startDate: 'invalid' },
    { ...period, startDate: '2026-02-30' },
    { ...period, endDate: '2026-10-18T12:00:00Z' },
    { startDate: period.endDate, endDate: period.startDate },
  ])('rejects invalid ranges: %j', async body => {
    await request(app.getHttpServer())
      .post('/sessions/trigger-reapply')
      .set('x-test-role', 'admin')
      .send(body)
      .expect(400);
    expect(trainingGroups.applyToSessionsInRange).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer())
      .post('/sessions/trigger-reapply')
      .send(period)
      .expect(401);
    expect(trainingGroups.applyToSessionsInRange).not.toHaveBeenCalled();
  });

  it.each(['parent', 'player', 'coach'])('rejects role %s', async role => {
    await request(app.getHttpServer())
      .post('/sessions/trigger-reapply')
      .set('x-test-role', role)
      .send(period)
      .expect(403);
    expect(trainingGroups.applyToSessionsInRange).not.toHaveBeenCalled();
  });
});
