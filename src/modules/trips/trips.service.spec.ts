import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { DriversService } from '../drivers/drivers.service';
import type { AuditService } from '../../audit/audit.service';
import type { OutboxService } from '../../outbox/outbox.service';
import { TripsService } from './trips.service';

describe('TripsService', () => {
  it('rejects invalid seatsTotal', async () => {
    const prisma = {} as unknown as PrismaService;
    const drivers = {
      assertVerifiedDriver: jest.fn().mockResolvedValue(null),
    } as unknown as DriversService;
    const audit = {} as unknown as AuditService;
    const outbox = {} as unknown as OutboxService;
    const service = new TripsService(prisma, drivers, audit, outbox);

    await expect(
      service.createTrip('driver-1', {
        fromCityId: 'city-1',
        toCityId: 'city-2',
        departureAt: new Date(Date.now() + 3600_000).toISOString(),
        seatsTotal: 0,
        price: 1000,
        currency: 'UZS',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
