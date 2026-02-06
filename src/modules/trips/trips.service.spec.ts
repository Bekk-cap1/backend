import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { TripsService } from './trips.service';

describe('TripsService', () => {
  const drivers = {
    assertVerifiedDriver: jest.fn().mockResolvedValue(undefined),
  } as { assertVerifiedDriver: jest.Mock };
  const audit = {
    logTx: jest.fn().mockResolvedValue(undefined),
  } as { logTx: jest.Mock };
  const outbox = {
    enqueueTx: jest.fn().mockResolvedValue(undefined),
  } as { enqueueTx: jest.Mock };

  const prismaBase = {
    vehicle: {
      findFirst: jest.fn(),
    },
    trip: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid seatsTotal', async () => {
    const prisma = prismaBase as unknown as PrismaService;
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

  it('rejects invalid departureAt', async () => {
    const prisma = prismaBase as unknown as PrismaService;
    const service = new TripsService(prisma, drivers, audit, outbox);

    await expect(
      service.createTrip('driver-1', {
        fromCityId: 'city-1',
        toCityId: 'city-2',
        departureAt: 'invalid-date',
        seatsTotal: 1,
        price: 1000,
        currency: 'UZS',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when vehicle does not belong to driver', async () => {
    const prisma = prismaBase as unknown as PrismaService;
    (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new TripsService(prisma, drivers, audit, outbox);

    await expect(
      service.createTrip('driver-1', {
        fromCityId: 'city-1',
        toCityId: 'city-2',
        departureAt: new Date(Date.now() + 3600_000).toISOString(),
        seatsTotal: 1,
        price: 1000,
        currency: 'UZS',
        vehicleId: 'vehicle-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('publishes trip and enqueues outbox', async () => {
    const prisma = prismaBase as unknown as PrismaService;
    const trip = {
      id: 'trip-1',
      driverId: 'driver-1',
      status: 'draft',
      vehicleId: 'vehicle-1',
      departureAt: new Date(Date.now() + 3600_000),
      fromCityId: 'city-1',
      toCityId: 'city-2',
      price: 1000,
      currency: 'UZS',
      notes: null,
    };
    (prisma.trip.findUnique as jest.Mock).mockResolvedValue(trip);
    (prisma.$transaction as jest.Mock).mockImplementation(
      (cb: (tx: { trip: { update: jest.Mock } }) => unknown) => {
        const tx = {
          trip: {
            update: jest.fn().mockResolvedValue({
              ...trip,
              status: 'published',
            }),
          },
        };
        return cb(tx);
      },
    );

    const service = new TripsService(prisma, drivers, audit, outbox);
    const result = await service.publishTrip('driver-1', 'trip-1');

    expect(result.status).toBe('published');
    expect(audit.logTx).toHaveBeenCalled();
    expect(outbox.enqueueTx).toHaveBeenCalled();
  });

  it('rejects publish when trip is missing', async () => {
    const prisma = prismaBase as unknown as PrismaService;
    (prisma.trip.findUnique as jest.Mock).mockResolvedValue(null);
    const service = new TripsService(prisma, drivers, audit, outbox);

    await expect(
      service.publishTrip('driver-1', 'trip-missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
