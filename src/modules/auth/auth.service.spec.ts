import { BadRequestException } from '@nestjs/common';
import { Role, type User } from '@prisma/client';
import { AuthService } from './auth.service';
import type { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { AuthStrategiesService } from './strategies/auth.service';
import { isRecord } from '../../common/utils/type-guards';

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
  } as unknown as AuthStrategiesService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when user already exists', async () => {
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
});
