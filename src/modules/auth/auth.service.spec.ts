import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  const strategies = {
    issueTokens: jest.fn(),
    rotateRefresh: jest.fn(),
    revokeByRefreshToken: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when user already exists', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    const service = new AuthService(prisma as any, strategies as any);

    await expect(service.register('+998900000000', 'Password123!')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates passenger role by default', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'user-1', phone: '+998900000000', role: Role.passenger });
    const hashSpy = jest.spyOn(bcrypt, 'hash').mockResolvedValue('hash' as any);

    const service = new AuthService(prisma as any, strategies as any);
    const result = await service.register('+998900000000', 'Password123!');

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: Role.passenger }),
      }),
    );
    expect(result.role).toBe(Role.passenger);

    hashSpy.mockRestore();
  });
});
