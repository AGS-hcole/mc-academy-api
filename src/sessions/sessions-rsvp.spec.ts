import { SessionsService } from './sessions.service';

describe('Sessions RSVP withdrawal routing', () => {
  it('routes NO to withdrawal using the authenticated user, independently of registration cutoff', async () => {
    const withdrawals = {
      withdraw: jest.fn().mockResolvedValue({ status: 'NO' }),
    };
    const service = new SessionsService({} as any, withdrawals as any);
    await expect(
      service.rsvp('session', 'user', 'NO', 'comment'),
    ).resolves.toEqual({ status: 'NO' });
    expect(withdrawals.withdraw).toHaveBeenCalledWith(
      'session',
      'user',
      'comment',
    );
  });

  it('keeps the original registration cutoff for YES', async () => {
    const db = {
      session: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ date: new Date('2000-01-01') }),
      },
    };
    const service = new SessionsService(db as any, {} as any);
    await expect(service.rsvp('session', 'user', 'YES')).rejects.toThrow(
      'Cutoff passed',
    );
  });
});

import { SessionsController } from './sessions.controller';

describe('RSVP identity', () => {
  it('uses only the authenticated identity', async () => {
    const sessions = { rsvp: jest.fn(), getSessionById: jest.fn() };
    const controller = new SessionsController(
      sessions as any,
      {} as any,
      {} as any,
    );
    await controller.rsvp('session', { user: { sub: 'authenticated' } }, {
      status: 'NO',
      userId: 'other',
    } as any);
    expect(sessions.rsvp).toHaveBeenCalledWith(
      'session',
      'authenticated',
      'NO',
      undefined,
    );
  });
  it('rejects a missing identity', async () => {
    const sessions = { rsvp: jest.fn() };
    const controller = new SessionsController(
      sessions as any,
      {} as any,
      {} as any,
    );
    await expect(
      controller.rsvp('session', {}, { status: 'NO' }),
    ).rejects.toThrow('User missing');
    expect(sessions.rsvp).not.toHaveBeenCalled();
  });
});
