import { BadRequestException } from '@nestjs/common';
import { TripsService } from './trips.service';

describe('TripsService', () => {
  it('rejects invalid seatsTotal', async () => {
    const prisma = {} as any;
    const drivers = { assertVerifiedDriver: jest.fn().mockResolvedValue(null) };
    const audit = {} as any;
    const outbox = {} as any;
    const service = new TripsService(prisma, drivers as any, audit, outbox);

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
