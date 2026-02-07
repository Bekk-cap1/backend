import {
  BadRequestException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { OtpPurpose, Role, type User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { isRecord } from '../../common/utils/type-guards';
import type { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { RedisService } from '../../infrastructure/redis/redis.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  type UserRecord = User;
  type UserCreateResult = Pick<User, 'id' | 'phone' | 'role'>;

  const userFindUniqueMock = jest.fn<Promise<UserRecord | null>, [unknown]>();
  const userCreateMock = jest.fn<Promise<UserCreateResult>, [unknown]>();
  const userUpdateManyMock = jest.fn<Promise<{ count: number }>, [unknown]>();

  const otpCreateMock = jest.fn<Promise<unknown>, [unknown]>();
  const otpFindFirstMock = jest.fn<Promise<unknown>, [unknown]>();
  const otpUpdateMock = jest.fn<Promise<unknown>, [unknown]>();

  const userSessionFindManyMock = jest.fn<Promise<unknown[]>, [unknown]>();
  const userSessionUpdateManyMock = jest.fn<
    Promise<{ count: number }>,
    [unknown]
  >();

  const redisIncrMock = jest.fn<Promise<number>, [string]>();
  const redisExpireMock = jest.fn<Promise<number>, [string, number]>();

  const prisma = {
    user: {
      findUnique: userFindUniqueMock,
      create: userCreateMock,
      updateMany: userUpdateManyMock,
    },
    otpCode: {
      create: otpCreateMock,
      findFirst: otpFindFirstMock,
      update: otpUpdateMock,
    },
    userSession: {
      findMany: userSessionFindManyMock,
      updateMany: userSessionUpdateManyMock,
    },
  } as unknown as PrismaService;

  const strategies = {
    issueTokens: jest.fn(),
    rotateRefresh: jest.fn(),
    revokeByRefreshToken: jest.fn(),
  };

  const redis = {
    raw: {
      incr: redisIncrMock,
      expire: redisExpireMock,
    },
  } as unknown as RedisService;

  const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    service = new AuthService(prisma, strategies as never, redis);
  });

  it('throws when user already exists', async () => {
    bcryptMock.hash.mockResolvedValue('hash');
    userFindUniqueMock.mockResolvedValue({
      id: 'user-1',
      phone: '+998900000000',
      passwordHash: 'hash',
      role: Role.passenger,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.register('+998900000000', 'Password123!'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates passenger role by default', async () => {
    bcryptMock.hash.mockResolvedValue('hash');
    userFindUniqueMock.mockResolvedValue(null);
    userCreateMock.mockResolvedValue({
      id: 'user-1',
      phone: '+998900000000',
      role: Role.passenger,
    });

    const result = await service.register('+998900000000', 'Password123!');
    const createArgs = userCreateMock.mock.calls[0]?.[0];

    if (!isRecord(createArgs) || !isRecord(createArgs.data)) {
      throw new Error('Expected create args to include data');
    }

    expect(createArgs.data.role).toBe(Role.passenger);
    expect(result.role).toBe(Role.passenger);
  });

  it('hashes password on register', async () => {
    bcryptMock.hash.mockResolvedValue('hashed-password');
    userFindUniqueMock.mockResolvedValue(null);
    userCreateMock.mockResolvedValue({
      id: 'user-2',
      phone: '+998900000123',
      role: Role.passenger,
    });

    await service.register('+998900000123', 'Password123!');
    expect(bcryptMock.hash).toHaveBeenCalledWith('Password123!', 10);
  });

  it('rejects invalid credentials on missing user', async () => {
    userFindUniqueMock.mockResolvedValue(null);

    await expect(
      service.validateUser('+998900000000', 'Password123!'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects invalid credentials on wrong password', async () => {
    userFindUniqueMock.mockResolvedValue({
      id: 'user-1',
      phone: '+998900000000',
      passwordHash: 'hash',
      role: Role.passenger,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    bcryptMock.compare.mockResolvedValue(false);

    await expect(
      service.validateUser('+998900000000', 'Password123!'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns user data on valid credentials', async () => {
    userFindUniqueMock.mockResolvedValue({
      id: 'user-1',
      phone: '+998900000000',
      passwordHash: 'hash',
      role: Role.passenger,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    bcryptMock.compare.mockResolvedValue(true);

    const result = await service.validateUser('+998900000000', 'Password123!');
    expect(result).toEqual({
      id: 'user-1',
      phone: '+998900000000',
      role: Role.passenger,
    });
  });

  it('issues tokens via strategies service', async () => {
    strategies.issueTokens.mockResolvedValue({ accessToken: 'access' });

    await service.issueTokens(
      { id: 'user-1', phone: '+998900000000', role: Role.passenger },
      'ua',
      '127.0.0.1',
    );

    expect(strategies.issueTokens).toHaveBeenCalledWith({
      userId: 'user-1',
      phone: '+998900000000',
      role: Role.passenger,
      userAgent: 'ua',
      ip: '127.0.0.1',
    });
  });

  it('rotates refresh token on refresh', async () => {
    strategies.rotateRefresh.mockResolvedValue({ accessToken: 'access' });

    await service.refresh('refresh-token', 'ua', '127.0.0.1');
    expect(strategies.rotateRefresh).toHaveBeenCalledWith({
      refreshToken: 'refresh-token',
      userAgent: 'ua',
      ip: '127.0.0.1',
    });
  });

  it('revokes refresh token on logout', async () => {
    strategies.revokeByRefreshToken.mockResolvedValue(undefined);

    await service.logout('refresh-token');
    expect(strategies.revokeByRefreshToken).toHaveBeenCalledWith(
      'refresh-token',
    );
  });

  it('sends otp in test mode and stores hash', async () => {
    redisIncrMock.mockResolvedValue(1);
    redisExpireMock.mockResolvedValue(1);
    otpCreateMock.mockResolvedValue({});

    const result = await service.sendOtp('+998901111111', OtpPurpose.login);

    expect(result.sent).toBe(true);
    expect(result.code).toBe('123456');
    expect(redisExpireMock).toHaveBeenCalledWith('otp:send:+998901111111', 600);
    const createArgs = otpCreateMock.mock.calls[0]?.[0];
    if (!isRecord(createArgs) || !isRecord(createArgs.data)) {
      throw new Error('Expected otp create args');
    }
    expect(createArgs.data.phone).toBe('+998901111111');
    expect(createArgs.data.purpose).toBe(OtpPurpose.login);
  });

  it('rejects sendOtp when rate limit exceeded', async () => {
    redisIncrMock.mockResolvedValue(6);

    await expect(
      service.sendOtp('+998901111111', OtpPurpose.login),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('rejects verifyOtp when code does not exist', async () => {
    otpFindFirstMock.mockResolvedValue(null);

    await expect(
      service.verifyOtp('+998901111111', OtpPurpose.login, '000000'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects verifyOtp when otp is locked', async () => {
    otpFindFirstMock.mockResolvedValue({
      id: 'otp-1',
      codeHash: 'abc',
      attempts: 5,
    });

    await expect(
      service.verifyOtp('+998901111111', OtpPurpose.login, '000000'),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('increments attempts on invalid otp', async () => {
    otpFindFirstMock.mockResolvedValue({
      id: 'otp-1',
      codeHash: 'hashed',
      attempts: 0,
    });
    otpUpdateMock.mockResolvedValue({});

    await expect(
      service.verifyOtp('+998901111111', OtpPurpose.login, '000000'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(otpUpdateMock).toHaveBeenCalledWith({
      where: { id: 'otp-1' },
      data: { attempts: { increment: 1 } },
    });
  });

  it('consumes otp on valid code', async () => {
    const validCode = '123456';
    const hash = createHash('sha256').update(validCode).digest('hex');
    otpFindFirstMock.mockResolvedValue({
      id: 'otp-1',
      codeHash: hash,
      attempts: 0,
    });
    otpUpdateMock.mockResolvedValue({});

    await expect(
      service.verifyOtp('+998901111111', OtpPurpose.login, validCode),
    ).resolves.toEqual({ ok: true });
  });

  it('requests password reset using otp purpose reset_password', async () => {
    redisIncrMock.mockResolvedValue(1);
    redisExpireMock.mockResolvedValue(1);
    otpCreateMock.mockResolvedValue({});

    await service.requestPasswordReset('+998901111111');

    const createArgs = otpCreateMock.mock.calls[0]?.[0];
    if (!isRecord(createArgs) || !isRecord(createArgs.data)) {
      throw new Error('Expected otp create args');
    }
    expect(createArgs.data.purpose).toBe(OtpPurpose.reset_password);
  });

  it('confirms password reset and updates password hash', async () => {
    const validCode = '123456';
    const hash = createHash('sha256').update(validCode).digest('hex');
    otpFindFirstMock.mockResolvedValue({
      id: 'otp-2',
      codeHash: hash,
      attempts: 0,
    });
    otpUpdateMock.mockResolvedValue({});
    bcryptMock.hash.mockResolvedValue('new-hash');
    userUpdateManyMock.mockResolvedValue({ count: 1 });

    await expect(
      service.confirmPasswordReset(
        '+998901111111',
        validCode,
        'NewPassword123!',
      ),
    ).resolves.toEqual({ ok: true });

    expect(userUpdateManyMock).toHaveBeenCalledWith({
      where: { phone: '+998901111111' },
      data: { passwordHash: 'new-hash' },
    });
  });

  it('fails password reset when user is absent', async () => {
    const validCode = '123456';
    const hash = createHash('sha256').update(validCode).digest('hex');
    otpFindFirstMock.mockResolvedValue({
      id: 'otp-2',
      codeHash: hash,
      attempts: 0,
    });
    otpUpdateMock.mockResolvedValue({});
    bcryptMock.hash.mockResolvedValue('new-hash');
    userUpdateManyMock.mockResolvedValue({ count: 0 });

    await expect(
      service.confirmPasswordReset(
        '+998901111111',
        validCode,
        'NewPassword123!',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists sessions for user', async () => {
    userSessionFindManyMock.mockResolvedValue([{ id: 's1' }]);

    const sessions = await service.listSessions('user-1');

    expect(userSessionFindManyMock).toHaveBeenCalled();
    expect(sessions).toEqual([{ id: 's1' }]);
  });

  it('revokes existing session', async () => {
    userSessionUpdateManyMock.mockResolvedValue({ count: 1 });

    await expect(service.revokeSession('user-1', 'session-1')).resolves.toEqual(
      { ok: true },
    );
  });

  it('fails when session not found on revoke', async () => {
    userSessionUpdateManyMock.mockResolvedValue({ count: 0 });

    await expect(
      service.revokeSession('user-1', 'session-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
