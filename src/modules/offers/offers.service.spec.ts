import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { AuditService } from '../../audit/audit.service';
import type { OutboxService } from '../../outbox/outbox.service';
import type { DriversService } from '../drivers/drivers.service';
import { OffersService } from './offers.service';

describe('OffersService', () => {
  const prisma = {
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const audit = {} as unknown as AuditService;
  const outbox = {} as unknown as OutboxService;
  const drivers = {
    assertVerifiedDriver: jest.fn().mockResolvedValue(null),
  } as { assertVerifiedDriver: jest.Mock };
  const config = {
    get: jest.fn().mockReturnValue(undefined),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid price', async () => {
    const service = new OffersService(prisma, audit, outbox, drivers, config);

    await expect(
      service.createOffer('user-1', Role.passenger, 'request-1', { price: 0 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects non-driver/passenger roles', async () => {
    const service = new OffersService(prisma, audit, outbox, drivers, config);

    await expect(
      service.createOffer('user-1', Role.admin, 'request-1', { price: 1000 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires verified driver when role is driver', async () => {
    const service = new OffersService(prisma, audit, outbox, drivers, config);
    (prisma.$transaction as jest.Mock).mockImplementation(() => {
      throw new BadRequestException('skip');
    });

    await expect(
      service.createOffer('user-1', Role.driver, 'request-1', { price: 1000 }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(drivers.assertVerifiedDriver).toHaveBeenCalledWith('user-1');
  });
});
