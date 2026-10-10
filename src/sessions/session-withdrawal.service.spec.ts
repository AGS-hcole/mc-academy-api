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
    jest.useFakeTimers().setSystemTime(new Date('2026-10-11T18:00:00.000Z'));
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

  it('withdraws after the registration cutoff, up to 20:00 inclusive on the previous Paris day', async () => {
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

  it.each(['2026-10-11T17:59:59.999Z', '2026-10-11T18:00:00.000Z'])(
    'allows withdrawal at %s',
    async now => {
      jest.setSystemTime(new Date(now));
      await service.withdraw('session', 'user');
      expect(db.attendance.updateMany).toHaveBeenCalled();
    },
  );

  it.each([
    '2026-10-11T18:00:00.001Z',
    '2026-10-11T21:59:59.999Z',
    '2026-10-11T22:00:00.000Z',
    '2026-10-13T10:00:00.000Z',
  ])(
    'rejects withdrawal at %s without changing attendance or queuing emails',
    async now => {
      jest.setSystemTime(new Date(now));
      await expect(service.withdraw('session', 'user')).rejects.toThrow(
        'Withdrawal cutoff passed',
      );
      expect(db.attendance.updateMany).not.toHaveBeenCalled();
      expect(db.sessionWithdrawalEmail.createMany).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['2026-03-29', '2026-03-28T19:00:00.000Z'],
    ['2026-03-30', '2026-03-29T18:00:00.000Z'],
    ['2026-10-25', '2026-10-24T18:00:00.000Z'],
    ['2026-10-26', '2026-10-25T19:00:00.000Z'],
    ['2027-01-01', '2026-12-31T19:00:00.000Z'],
  ])('handles the previous Paris calendar day for %s', (day, expected) => {
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
