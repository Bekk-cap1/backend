import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { OutboxService } from '../../../outbox/outbox.service';
import { RequestsService } from './requests.service';

describe('RequestsService', () => {
  const prismaBase = {
    trip: { findUnique: jest.fn() },
    tripRequest: { findMany: jest.fn() },
  } as unknown as PrismaService;
  const outbox = {
    enqueueTx: jest.fn(),
  } as unknown as OutboxService;
  const drivers = {
    assertVerifiedDriver: jest.fn().mockResolvedValue(undefined),
  } as { assertVerifiedDriver: jest.Mock };
  const config = {
    get: jest.fn().mockReturnValue(undefined),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when trip is missing', async () => {
    const prisma = prismaBase as unknown as PrismaService;
    (prisma.trip.findUnique as jest.Mock).mockResolvedValue(null);
    const service = new RequestsService(prisma, outbox, drivers, config);

    await expect(
      service.createRequest('passenger-1', 'trip-1', {
        seats: 1,
        price: 1000,
        currency: 'UZS',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects requests for non-published trips', async () => {
    const prisma = prismaBase as unknown as PrismaService;
    (prisma.trip.findUnique as jest.Mock).mockResolvedValue({
      id: 'trip-1',
      status: 'draft',
      seatsAvailable: 2,
    });
    const service = new RequestsService(prisma, outbox, drivers, config);

    await expect(
      service.createRequest('passenger-1', 'trip-1', {
        seats: 1,
        price: 1000,
        currency: 'UZS',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when seats exceed available', async () => {
    const prisma = prismaBase as unknown as PrismaService;
    (prisma.trip.findUnique as jest.Mock).mockResolvedValue({
      id: 'trip-1',
      status: 'published',
      seatsAvailable: 1,
    });
    const service = new RequestsService(prisma, outbox, drivers, config);

    await expect(
      service.createRequest('passenger-1', 'trip-1', {
        seats: 2,
        price: 1000,
        currency: 'UZS',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('asserts verified driver when listing driver requests', async () => {
    const prisma = prismaBase as unknown as PrismaService;
    (prisma.tripRequest.findMany as jest.Mock).mockResolvedValue([]);
    const service = new RequestsService(prisma, outbox, drivers, config);

    await service.listDriverRequests('driver-1', 'driver');
    expect(drivers.assertVerifiedDriver).toHaveBeenCalledWith('driver-1');
  });
});
