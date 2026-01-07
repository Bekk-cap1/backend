import { NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { OutboxService } from '../../../outbox/outbox.service';
import type { DriversService } from '../../drivers/drivers.service';
import { RequestsService } from './requests.service';

describe('RequestsService', () => {
  it('throws when trip is missing', async () => {
    const prisma = {
      trip: { findUnique: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const outbox = {} as unknown as OutboxService;
    const drivers = {} as unknown as DriversService;
    const config = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const service = new RequestsService(prisma, outbox, drivers, config);

    await expect(
      service.createRequest('passenger-1', 'trip-1', {
        seats: 1,
        price: 1000,
        currency: 'UZS',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
