import { NotFoundException } from '@nestjs/common';
import { RequestsService } from './requests.service';

describe('RequestsService', () => {
  it('throws when trip is missing', async () => {
    const prisma = {
      trip: { findUnique: jest.fn().mockResolvedValue(null) },
    } as any;
    const outbox = {} as any;
    const drivers = {} as any;
    const service = new RequestsService(prisma, outbox, drivers);

    await expect(
      service.createRequest('passenger-1', 'trip-1', { seats: 1, price: 1000, currency: 'UZS' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
