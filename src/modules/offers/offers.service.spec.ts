import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { AuditService } from '../../audit/audit.service';
import type { OutboxService } from '../../outbox/outbox.service';
import type { DriversService } from '../drivers/drivers.service';
import { OffersService } from './offers.service';

describe('OffersService', () => {
  it('rejects invalid price', async () => {
    const prisma = {} as unknown as PrismaService;
    const audit = {} as unknown as AuditService;
    const outbox = {} as unknown as OutboxService;
    const drivers = {
      assertVerifiedDriver: jest.fn().mockResolvedValue(null),
    } as unknown as DriversService;
    const config = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const service = new OffersService(prisma, audit, outbox, drivers, config);

    await expect(
      service.createOffer('user-1', Role.passenger, 'request-1', { price: 0 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
