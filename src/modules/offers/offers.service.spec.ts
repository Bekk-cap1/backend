import { BadRequestException } from '@nestjs/common';
import { OffersService } from './offers.service';

describe('OffersService', () => {
  it('rejects invalid price', async () => {
    const prisma = {} as any;
    const audit = {} as any;
    const outbox = {} as any;
    const drivers = { assertVerifiedDriver: jest.fn().mockResolvedValue(null) } as any;
    const service = new OffersService(prisma, audit, outbox, drivers);

    await expect(
      service.createOffer('user-1', 'passenger', 'request-1', { price: 0 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
