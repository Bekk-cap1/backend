import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Role, type User } from '@prisma/client';
import { AuthService } from './auth.service';
import type { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { AuthStrategiesService } from './strategies/auth.service';
import { isRecord } from '../../common/utils/type-guards';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  type UserRecord = User;
  type UserCreateResult = Pick<User, 'id' | 'phone' | 'role'>;

  const findUniqueMock = jest.fn<Promise<UserRecord | null>, [unknown]>();
  const createMock = jest.fn<Promise<UserCreateResult>, [unknown]>();
  const prisma = {
    user: {
      findUnique: findUniqueMock,
      create: createMock,
    },
  } as unknown as PrismaService;
  const strategies = {
    issueTokens: jest.fn(),
    rotateRefresh: jest.fn(),
    revokeByRefreshToken: jest.fn(),
  } as {
    issueTokens: jest.Mock;
    rotateRefresh: jest.Mock;
    revokeByRefreshToken: jest.Mock;
  };
  const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when user already exists', async () => {
    bcryptMock.hash.mockResolvedValue('hash');
    findUniqueMock.mockResolvedValue({
      id: 'user-1',
      phone: '+998900000000',
      passwordHash: 'hash',
      role: Role.passenger,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = new AuthService(prisma, strategies);

    await expect(
      service.register('+998900000000', 'Password123!'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates passenger role by default', async () => {
    bcryptMock.hash.mockResolvedValue('hash');
    findUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue({
      id: 'user-1',
      phone: '+998900000000',
      role: Role.passenger,
    });
    const service = new AuthService(prisma, strategies);
    const result = await service.register('+998900000000', 'Password123!');

    const createArgs = createMock.mock.calls[0]?.[0];
    if (!isRecord(createArgs) || !isRecord(createArgs.data)) {
      throw new Error('Expected create args to include data');
    }
    expect(createArgs.data.role).toBe(Role.passenger);
    expect(result.role).toBe(Role.passenger);
  });

  it('hashes password on register', async () => {
    bcryptMock.hash.mockResolvedValue('hashed-password');
    findUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue({
      id: 'user-2',
      phone: '+998900000123',
      role: Role.passenger,
    });

    const service = new AuthService(prisma, strategies);
    await service.register('+998900000123', 'Password123!');

    expect(bcryptMock.hash).toHaveBeenCalledWith('Password123!', 10);
  });

  it('rejects invalid credentials on missing user', async () => {
    findUniqueMock.mockResolvedValue(null);
    const service = new AuthService(prisma, strategies);

    await expect(
      service.validateUser('+998900000000', 'Password123!'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects invalid credentials on wrong password', async () => {
    findUniqueMock.mockResolvedValue({
      id: 'user-1',
      phone: '+998900000000',
      passwordHash: 'hash',
      role: Role.passenger,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    bcryptMock.compare.mockResolvedValue(false);

    const service = new AuthService(prisma, strategies);
    await expect(
      service.validateUser('+998900000000', 'Password123!'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns user data on valid credentials', async () => {
    findUniqueMock.mockResolvedValue({
      id: 'user-1',
      phone: '+998900000000',
      passwordHash: 'hash',
      role: Role.passenger,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    bcryptMock.compare.mockResolvedValue(true);

    const service = new AuthService(prisma, strategies);
    const result = await service.validateUser(
      '+998900000000',
      'Password123!',
    );

    expect(result).toEqual({
      id: 'user-1',
      phone: '+998900000000',
      role: Role.passenger,
    });
  });

  it('issues tokens via strategies service', async () => {
    strategies.issueTokens = jest.fn().mockResolvedValue({
      accessToken: 'access',
    });
    const service = new AuthService(prisma, strategies);

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
    strategies.rotateRefresh = jest.fn().mockResolvedValue({
      accessToken: 'access',
    });
    const service = new AuthService(prisma, strategies);

    await service.refresh('refresh-token', 'ua', '127.0.0.1');
    expect(strategies.rotateRefresh).toHaveBeenCalledWith({
      refreshToken: 'refresh-token',
      userAgent: 'ua',
      ip: '127.0.0.1',
    });
  });

  it('revokes refresh token on logout', async () => {
    strategies.revokeByRefreshToken = jest.fn().mockResolvedValue(undefined);
    const service = new AuthService(prisma, strategies);

    await service.logout('refresh-token');
    expect(strategies.revokeByRefreshToken).toHaveBeenCalledWith(
      'refresh-token',
    );
  });
});
