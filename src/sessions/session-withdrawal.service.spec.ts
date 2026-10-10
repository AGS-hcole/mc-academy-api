import {
  SessionWithdrawalService,
  withdrawalDeadline,
  escapeEmailValue,
} from './session-withdrawal.service';

describe('Session withdrawal', () => {
  let service: SessionWithdrawalService;
  let db: any;
  let email: any;
  const attendance = {
    id: 'attendance',
    status: 'YES',
    comment: 'Original',
    user: {
      firstname: '<Alice>',
      lastname: 'Test',
      email: 'user@test.fr',
      phone: '123',
    },
  };
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-11T21:59:59.999Z'));
    db = {
      session: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'session',
          date: new Date('2026-10-12T00:00:00Z'),
          slot: 'AM',
          startTime: new Date('1970-01-01T09:30:00Z'),
          endTime: null,
          site: { name: 'Paris', address: '1 rue', city: 'Paris' },
        }),
      },
      attendance: {
        findUnique: jest.fn().mockResolvedValue(attendance),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      user: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { email: 'admin1@test.fr' },
            { email: 'admin2@test.fr' },
          ]),
      },
      sessionWithdrawalEmail: {
        createMany: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(),
      },
    };
    db.$transaction = jest.fn(callback => callback(db));
    email = { sendTemplateEmail: jest.fn() };
    service = new SessionWithdrawalService(db, email);
  });
  afterEach(() => jest.useRealTimers());

  it('withdraws after the registration cutoff, up to the last millisecond of the previous day', async () => {
    await service.withdraw('session', 'user');
    expect(db.attendance.updateMany).toHaveBeenCalledWith({
      where: { id: 'attendance', status: 'YES' },
      data: { status: 'NO', respondedAt: new Date() },
    });
    expect(db.user.findMany).toHaveBeenCalledWith({
      where: { role: 'admin' },
      select: { email: true },
    });
    const jobs = db.sessionWithdrawalEmail.createMany.mock.calls[0][0].data;
    expect(jobs.map(job => job.recipient)).toEqual([
      'admin1@test.fr',
      'admin2@test.fr',
    ]);
    expect(jobs[0].replacements).toMatchObject({
      name: '&lt;Alice&gt; Test',
      start: '09:30',
      sessionId: 'session',
      userId: 'user',
      email: 'user@test.fr',
      phone: '123',
      comment: 'Original',
    });
  });

  it('rejects midnight and past sessions without changing attendance', async () => {
    jest.setSystemTime(new Date('2026-10-11T22:00:00Z'));
    await expect(service.withdraw('session', 'user')).rejects.toThrow(
      'Withdrawal cutoff passed',
    );
    expect(db.attendance.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    ['2026-03-29', '2026-03-28T23:00:00.000Z'],
    ['2026-03-30', '2026-03-29T22:00:00.000Z'],
    ['2026-10-25', '2026-10-24T22:00:00.000Z'],
    ['2026-10-26', '2026-10-25T23:00:00.000Z'],
  ])('handles the Paris daylight saving boundary for %s', (day, expected) => {
    expect(withdrawalDeadline(new Date(day)).toISOString()).toBe(expected);
  });

  it('rejects a user who never registered', async () => {
    db.attendance.findUnique.mockResolvedValue(null);
    await expect(service.withdraw('session', 'stranger')).rejects.toThrow(
      'Not registered',
    );
    expect(db.sessionWithdrawalEmail.createMany).not.toHaveBeenCalled();
  });

  it('treats repeat withdrawals as idempotent', async () => {
    db.attendance.findUnique.mockResolvedValue({ ...attendance, status: 'NO' });
    await service.withdraw('session', 'user');
    expect(db.attendance.updateMany).not.toHaveBeenCalled();
    expect(db.sessionWithdrawalEmail.createMany).not.toHaveBeenCalled();
  });

  it('does not queue duplicate mail when a concurrent withdrawal won', async () => {
    db.attendance.updateMany.mockResolvedValue({ count: 0 });
    await service.withdraw('session', 'user');
    expect(db.sessionWithdrawalEmail.createMany).not.toHaveBeenCalled();
  });

  it('propagates queue write failure to roll back the transaction', async () => {
    db.sessionWithdrawalEmail.createMany.mockRejectedValue(
      new Error('database unavailable'),
    );
    await expect(service.withdraw('session', 'user')).rejects.toThrow(
      'database unavailable',
    );
  });

  it('escapes HTML, replacement tokens and template variables', () => {
    expect(escapeEmailValue('<b>{{email}} $&')).toBe(
      '&lt;b&gt;&#123;&#123;email&#125;&#125; &#36;&amp;',
    );
  });

  it('continues other recipients on failure and leaves failed delivery for retry', async () => {
    db.sessionWithdrawalEmail.findMany.mockResolvedValue([
      { id: '1', recipient: 'admin1@test.fr', replacements: {} },
      { id: '2', recipient: 'admin2@test.fr', replacements: {} },
    ]);
    email.sendTemplateEmail
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined);
    await service.deliverPendingEmails();
    expect(email.sendTemplateEmail).toHaveBeenCalledTimes(2);
    expect(db.sessionWithdrawalEmail.update).toHaveBeenCalledTimes(1);
    expect(db.sessionWithdrawalEmail.update).toHaveBeenCalledWith({
      where: { id: '2' },
      data: { sentAt: new Date() },
    });
    expect(
      db.sessionWithdrawalEmail.updateMany.mock.calls[0][0].data.availableAt.getTime(),
    ).toBe(Date.now() + 300000);
  });

  it('does not send a job claimed by another worker', async () => {
    db.sessionWithdrawalEmail.findMany.mockResolvedValue([{ id: '1' }]);
    db.sessionWithdrawalEmail.updateMany.mockResolvedValue({ count: 0 });
    await service.deliverPendingEmails();
    expect(email.sendTemplateEmail).not.toHaveBeenCalled();
  });
});
