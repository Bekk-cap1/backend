import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  OfferStatus,
  Prisma,
  RequestStatus,
  TripStatus,
} from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { DriversService } from '../drivers/drivers.service';

import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { SearchTripsDto } from './dto/search-trips.dto';

import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/audit.actions';

import { OutboxService } from '../../outbox/outbox.service';
import { OutboxTopic } from '../../outbox/outbox.topics';

const confirmedBookingStatuses: BookingStatus[] = [
  BookingStatus.confirmed,
  BookingStatus.paid,
];

type Tx = Prisma.TransactionClient | PrismaService;

type CityTerritoryRow = {
  id: string;
  name: string;
  isActive: boolean;
  territoryRadiusKm: number | null;
  lat: number | null;
  lon: number | null;
};

const seatColumns = ['A', 'B', 'C', 'D'] as const;

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drivers: DriversService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  private assertLatLonPair(
    lat: number | undefined,
    lon: number | undefined,
    label: string,
  ) {
    const hasLat = lat !== undefined;
    const hasLon = lon !== undefined;
    if (hasLat !== hasLon) {
      throw new BadRequestException(
        `${label}Lat and ${label}Lon must be provided together`,
      );
    }
  }

  private async getCityTerritory(tx: Tx, cityId: string) {
    const rows = await tx.$queryRaw<CityTerritoryRow[]>`
      SELECT
        c."id",
        c."name",
        c."isActive",
        c."territoryRadiusKm",
        ST_Y(c."location"::geometry) AS "lat",
        ST_X(c."location"::geometry) AS "lon"
      FROM "City" c
      WHERE c."id" = ${cityId}
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      throw new NotFoundException(`City not found: ${cityId}`);
    }
    return row;
  }

  private async assertCityActive(tx: Tx, cityId: string, label: string) {
    const city = await this.getCityTerritory(tx, cityId);
    if (!city.isActive) {
      throw new BadRequestException(
        `${label} city "${city.name}" is inactive and cannot be used`,
      );
    }
    return city;
  }

  private async assertPointInsideCityTerritory(
    tx: Tx,
    cityId: string,
    lat: number,
    lon: number,
    label: string,
  ) {
    const city = await this.assertCityActive(tx, cityId, label);
    if (city.lat === null || city.lon === null) {
      throw new BadRequestException(
        `${label} city "${city.name}" has no center coordinates configured`,
      );
    }

    const [distanceRow] = await tx.$queryRaw<Array<{ meters: number }>>`
      SELECT ST_Distance(
        ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
        c."location"
      ) AS meters
      FROM "City" c
      WHERE c."id" = ${cityId}
      LIMIT 1
    `;

    const distanceMeters = Number(distanceRow?.meters ?? 0);
    const maxMeters = Number(city.territoryRadiusKm ?? 80) * 1000;
    if (distanceMeters > maxMeters) {
      throw new BadRequestException(
        `${label} point is outside "${city.name}" territory (${Math.round(
          maxMeters,
        )}m radius)`,
      );
    }
  }

  private async setTripPoint(
    tx: Tx,
    tripId: string,
    point: 'fromPoint' | 'toPoint',
    lat: number,
    lon: number,
  ) {
    if (point === 'fromPoint') {
      await tx.$executeRaw`
        UPDATE "Trip"
        SET "fromPoint" = ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
        WHERE "id" = ${tripId}
      `;
      return;
    }
    await tx.$executeRaw`
      UPDATE "Trip"
      SET "toPoint" = ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
      WHERE "id" = ${tripId}
    `;
  }

  private buildSeatLayout(seatsTotal: number) {
    const normalized = Math.max(1, Math.min(16, seatsTotal));
    const rows = Math.ceil(normalized / seatColumns.length);
    const seats: string[] = [];
    for (let row = 1; row <= rows; row += 1) {
      for (const column of seatColumns) {
        if (seats.length >= normalized) break;
        seats.push(`${row}${column}`);
      }
    }
    return seats;
  }

  private async assertVehicleOwnedByDriver(
    vehicleId: string,
    driverId: string,
  ) {
    const v = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, userId: driverId },
      select: { id: true },
    });
    if (!v) throw new ForbiddenException('Vehicle does not belong to driver');
  }

  // ---------------------------------------------------------------------------
  // TRIPS
  // ---------------------------------------------------------------------------

  async createTrip(driverId: string, dto: CreateTripDto) {
    await this.drivers.assertVerifiedDriver(driverId);
    this.assertLatLonPair(dto.fromLat, dto.fromLon, 'from');
    this.assertLatLonPair(dto.toLat, dto.toLon, 'to');

    const seatsTotal = dto.seatsTotal ?? 4;
    if (seatsTotal <= 0)
      throw new BadRequestException('seatsTotal must be > 0');
    if (dto.price <= 0) throw new BadRequestException('price must be > 0');

    if (dto.vehicleId) {
      await this.assertVehicleOwnedByDriver(dto.vehicleId, driverId);
    }

    const departureAt = new Date(dto.departureAt);
    if (Number.isNaN(departureAt.getTime()))
      throw new BadRequestException('Invalid departureAt');

    const arriveAt = dto.arriveAt ? new Date(dto.arriveAt) : null;
    if (dto.arriveAt && Number.isNaN(arriveAt!.getTime())) {
      throw new BadRequestException('Invalid arriveAt');
    }

    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await this.assertCityActive(tx, dto.fromCityId, 'from');
        await this.assertCityActive(tx, dto.toCityId, 'to');
        if (dto.fromLat !== undefined && dto.fromLon !== undefined) {
          await this.assertPointInsideCityTerritory(
            tx,
            dto.fromCityId,
            dto.fromLat,
            dto.fromLon,
            'from',
          );
        }
        if (dto.toLat !== undefined && dto.toLon !== undefined) {
          await this.assertPointInsideCityTerritory(
            tx,
            dto.toCityId,
            dto.toLat,
            dto.toLon,
            'to',
          );
        }

        const created = await tx.trip.create({
          data: {
            driverId,
            fromCityId: dto.fromCityId,
            toCityId: dto.toCityId,
            vehicleId: dto.vehicleId ?? null,

            departureAt,
            arriveAt,

            seatsTotal,
            seatsAvailable: seatsTotal,

            price: dto.price,
            currency: dto.currency ?? 'UZS',

            notes: dto.notes ?? null,
            status: TripStatus.draft,
          },
        });

        if (dto.fromLat !== undefined && dto.fromLon !== undefined) {
          await this.setTripPoint(tx, created.id, 'fromPoint', dto.fromLat, dto.fromLon);
        }
        if (dto.toLat !== undefined && dto.toLon !== undefined) {
          await this.setTripPoint(tx, created.id, 'toPoint', dto.toLat, dto.toLon);
        }

        await this.audit.logTx(tx, {
          action: AuditAction.TripCreate,
          entityType: 'trip',
          entityId: created.id,
          severity: 'info',
          metadata: {
            driverId,
            fromCityId: created.fromCityId,
            toCityId: created.toCityId,
            departureAt: created.departureAt,
            arriveAt: created.arriveAt,
            seatsTotal: created.seatsTotal,
            price: created.price,
            currency: created.currency,
            vehicleId: created.vehicleId,
            fromLat: dto.fromLat ?? null,
            fromLon: dto.fromLon ?? null,
            toLat: dto.toLat ?? null,
            toLon: dto.toLon ?? null,
          },
        });

        await this.outbox.enqueueTx(tx, {
          topic: OutboxTopic.TripCreated,
          aggregateType: 'trip',
          aggregateId: created.id,
          idempotencyKey: `trip:${created.id}:created`,
          payload: {
            tripId: created.id,
            driverId,
            status: created.status,
            departureAt: created.departureAt,
            fromCityId: created.fromCityId,
            toCityId: created.toCityId,
            price: created.price,
            currency: created.currency,
          },
        });

        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async publishTrip(driverId: string, tripId: string, notes?: string) {
    await this.drivers.assertVerifiedDriver(driverId);

    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.driverId !== driverId)
      throw new ForbiddenException('Not your trip');

    if (trip.status !== TripStatus.draft) {
      throw new BadRequestException('Only draft trip can be published');
    }
    if (!trip.vehicleId) {
      throw new BadRequestException(
        'Trip must have vehicleId before publishing',
      );
    }
    if (trip.departureAt.getTime() <= Date.now()) {
      throw new BadRequestException('departureAt must be in the future');
    }

    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const updated = await tx.trip.update({
          where: { id: tripId },
          data: {
            status: TripStatus.published,
            notes: notes ?? trip.notes,
          },
        });

        await this.audit.logTx(tx, {
          action: AuditAction.TripPublish,
          entityType: 'trip',
          entityId: tripId,
          severity: 'info',
          metadata: {
            fromStatus: TripStatus.draft,
            toStatus: TripStatus.published,
          },
        });

        await this.outbox.enqueueTx(tx, {
          topic: OutboxTopic.TripPublished,
          aggregateType: 'trip',
          aggregateId: tripId,
          idempotencyKey: `trip:${tripId}:published`,
          payload: {
            tripId,
            driverId,
            departureAt: updated.departureAt,
            fromCityId: updated.fromCityId,
            toCityId: updated.toCityId,
            price: updated.price,
            currency: updated.currency,
          },
        });

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async startTrip(driverId: string, tripId: string) {
    await this.drivers.assertVerifiedDriver(driverId);

    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.driverId !== driverId)
      throw new ForbiddenException('Not your trip');

    if (trip.status !== TripStatus.published) {
      throw new BadRequestException('Only published trip can be started');
    }

    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const updated = await tx.trip.update({
          where: { id: tripId },
          data: { status: TripStatus.started, startedAt: new Date() },
        });

        await this.audit.logTx(tx, {
          action: AuditAction.TripStart,
          entityType: 'trip',
          entityId: tripId,
          severity: 'info',
          metadata: {
            fromStatus: TripStatus.published,
            toStatus: TripStatus.started,
          },
        });

        await this.outbox.enqueueTx(tx, {
          topic: OutboxTopic.TripStarted,
          aggregateType: 'trip',
          aggregateId: tripId,
          idempotencyKey: `trip:${tripId}:started`,
          payload: {
            tripId,
            driverId,
            startedAt: updated.startedAt,
          },
        });

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async completeTrip(driverId: string, tripId: string) {
    await this.drivers.assertVerifiedDriver(driverId);

    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.driverId !== driverId)
      throw new ForbiddenException('Not your trip');

    if (trip.status !== TripStatus.started) {
      throw new BadRequestException('Only started trip can be completed');
    }

    await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const updatedTrip = await tx.trip.update({
          where: { id: tripId },
          data: { status: TripStatus.completed, completedAt: new Date() },
        });

        await tx.booking.updateMany({
          where: {
            tripId,
            status: { in: [BookingStatus.confirmed, BookingStatus.paid] },
          },
          data: { status: BookingStatus.completed, completedAt: new Date() },
        });

        await this.audit.logTx(tx, {
          action: AuditAction.TripComplete,
          entityType: 'trip',
          entityId: tripId,
          severity: 'info',
          metadata: {
            fromStatus: TripStatus.started,
            toStatus: TripStatus.completed,
          },
        });

        await this.outbox.enqueueTx(tx, {
          topic: OutboxTopic.TripCompleted,
          aggregateType: 'trip',
          aggregateId: tripId,
          idempotencyKey: `trip:${tripId}:completed`,
          payload: {
            tripId,
            driverId,
            completedAt: updatedTrip.completedAt,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return { ok: true };
  }

  async cancelTrip(driverId: string, tripId: string, reason?: string) {
    await this.drivers.assertVerifiedDriver(driverId);

    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const trip = await tx.trip.findUnique({
          where: { id: tripId },
          include: { bookings: true },
        });
        if (!trip) throw new NotFoundException('Trip not found');
        if (trip.driverId !== driverId)
          throw new ForbiddenException('Not your trip');

        if (trip.status === TripStatus.completed) {
          throw new BadRequestException('Completed trip cannot be canceled');
        }
        if (trip.status === TripStatus.canceled) return trip;

        const updatedTrip = await tx.trip.update({
          where: { id: tripId },
          data: {
            status: TripStatus.canceled,
            canceledAt: new Date(),
            cancelReason: reason ?? null,
          },
        });

        const now = new Date();

        // отменить pending requests
        await tx.tripRequest.updateMany({
          where: { tripId, status: RequestStatus.pending },
          data: {
            status: RequestStatus.canceled, // или rejected — как у тебя принято
            respondedAt: now,
            rejectionReason: reason ?? 'Trip canceled',
          },
        });

        // отменить active offers по этим requests
        await tx.offer.updateMany({
          where: { request: { tripId }, status: OfferStatus.active },
          data: {
            status: OfferStatus.canceled,
            respondedAt: now,
            responseReason: 'Trip canceled',
          },
        });

        const confirmedBookings = trip.bookings.filter((b) =>
          confirmedBookingStatuses.includes(b.status),
        );

        for (const b of confirmedBookings) {
          await tx.booking.update({
            where: { id: b.id },
            data: {
              status: BookingStatus.canceled,
              canceledAt: now,
              cancellationFeeAmount: 0,
            },
          });

          await tx.trip.update({
            where: { id: tripId },
            data: { seatsAvailable: { increment: b.seats } },
          });

          await tx.tripRequest.update({
            where: { id: b.requestId },
            data: {
              status: RequestStatus.canceled,
              respondedAt: new Date(),
              rejectionReason: reason ?? null,
            },
          });
        }

        await this.audit.logTx(tx, {
          action: AuditAction.TripCancel,
          entityType: 'trip',
          entityId: tripId,
          severity: 'warning',
          metadata: {
            fromStatus: trip.status,
            toStatus: TripStatus.canceled,
            reason: reason ?? null,
            canceledConfirmedBookings: confirmedBookings.length,
          },
        });

        await this.outbox.enqueueTx(tx, {
          topic: OutboxTopic.TripCanceled,
          aggregateType: 'trip',
          aggregateId: tripId,
          idempotencyKey: `trip:${tripId}:canceled`,
          payload: {
            tripId,
            driverId,
            canceledAt: updatedTrip.canceledAt,
            reason: reason ?? null,
            canceledConfirmedBookings: confirmedBookings.length,
          },
        });

        return updatedTrip;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  // ---------------------------------------------------------------------------
  // SEARCH
  // ---------------------------------------------------------------------------

  async searchTrips(dto: SearchTripsDto) {
    const page = dto.page ?? 1;
    const pageSize = dto.pageSize ?? 20;

    const where: Prisma.TripWhereInput = {
      ...(dto.fromCityId ? { fromCityId: dto.fromCityId } : {}),
      ...(dto.toCityId ? { toCityId: dto.toCityId } : {}),
      ...(dto.status
        ? { status: dto.status }
        : { status: TripStatus.published }),
      ...(dto.seats ? { seatsAvailable: { gte: dto.seats } } : {}),
      ...(dto.dateFrom || dto.dateTo
        ? {
            departureAt: {
              ...(dto.dateFrom ? { gte: new Date(dto.dateFrom) } : {}),
              ...(dto.dateTo ? { lte: new Date(dto.dateTo) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.trip.findMany({
        where,
        orderBy: { departureAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          fromCity: true,
          toCity: true,
          driver: { select: { id: true, phone: true } },
          vehicle: true,
        },
      }),
      this.prisma.trip.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async getTripById(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        fromCity: true,
        toCity: true,
        driver: { select: { id: true, phone: true, profile: true } },
        vehicle: true,
      },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }

  async getTripSeatMap(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        seatsTotal: true,
        seatsAvailable: true,
        requests: {
          where: { status: { in: [RequestStatus.pending, RequestStatus.accepted] } },
          select: { id: true, seatNumbers: true, status: true },
        },
        bookings: {
          where: {
            status: { in: [BookingStatus.confirmed, BookingStatus.paid, BookingStatus.completed] },
          },
          select: { id: true, seatNumbers: true, status: true },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const heldByRequests = new Set<string>();
    for (const request of trip.requests) {
      for (const seat of request.seatNumbers) {
        if (seat) heldByRequests.add(seat.trim().toUpperCase());
      }
    }

    const takenByBookings = new Set<string>();
    for (const booking of trip.bookings) {
      for (const seat of booking.seatNumbers) {
        if (seat) takenByBookings.add(seat.trim().toUpperCase());
      }
    }

    const seatLayout = this.buildSeatLayout(trip.seatsTotal);
    const unavailable = new Set<string>([...heldByRequests, ...takenByBookings]);

    return {
      tripId: trip.id,
      seatsTotal: trip.seatsTotal,
      seatsAvailable: trip.seatsAvailable,
      seatLayout,
      heldSeats: [...heldByRequests].sort(),
      takenSeats: [...takenByBookings].sort(),
      unavailableSeats: [...unavailable].sort(),
    };
  }

  async updateTrip(driverId: string, tripId: string, dto: UpdateTripDto) {
    await this.drivers.assertVerifiedDriver(driverId);
    this.assertLatLonPair(dto.fromLat, dto.fromLon, 'from');
    this.assertLatLonPair(dto.toLat, dto.toLon, 'to');

    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.driverId !== driverId)
      throw new ForbiddenException('Not your trip');
    if (trip.status !== TripStatus.draft) {
      throw new BadRequestException('Only draft trip can be updated');
    }

    if (dto.vehicleId) {
      await this.assertVehicleOwnedByDriver(dto.vehicleId, driverId);
    }

    const data: Prisma.TripUpdateInput = {};

    if (dto.fromCityId) data.fromCity = { connect: { id: dto.fromCityId } };
    if (dto.toCityId) data.toCity = { connect: { id: dto.toCityId } };
    if (dto.vehicleId !== undefined) {
      data.vehicle = dto.vehicleId
        ? { connect: { id: dto.vehicleId } }
        : { disconnect: true };
    }
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.notes !== undefined) data.notes = dto.notes;

    if (dto.departureAt) {
      const departureAt = new Date(dto.departureAt);
      if (Number.isNaN(departureAt.getTime())) {
        throw new BadRequestException('Invalid departureAt');
      }
      data.departureAt = departureAt;
    }

    if (dto.arriveAt !== undefined) {
      const arriveAt = dto.arriveAt ? new Date(dto.arriveAt) : null;
      if (dto.arriveAt && Number.isNaN(arriveAt!.getTime())) {
        throw new BadRequestException('Invalid arriveAt');
      }
      data.arriveAt = arriveAt;
    }

    if (dto.seatsTotal !== undefined) {
      if (dto.seatsTotal <= 0) {
        throw new BadRequestException('seatsTotal must be > 0');
      }
      data.seatsTotal = dto.seatsTotal;
      data.seatsAvailable = dto.seatsTotal;
    }

    if (dto.price !== undefined) {
      if (dto.price <= 0) {
        throw new BadRequestException('price must be > 0');
      }
      data.price = dto.price;
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const fromCityId = dto.fromCityId ?? trip.fromCityId;
      const toCityId = dto.toCityId ?? trip.toCityId;

      await this.assertCityActive(tx, fromCityId, 'from');
      await this.assertCityActive(tx, toCityId, 'to');

      if (dto.fromLat !== undefined && dto.fromLon !== undefined) {
        await this.assertPointInsideCityTerritory(
          tx,
          fromCityId,
          dto.fromLat,
          dto.fromLon,
          'from',
        );
      }
      if (dto.toLat !== undefined && dto.toLon !== undefined) {
        await this.assertPointInsideCityTerritory(
          tx,
          toCityId,
          dto.toLat,
          dto.toLon,
          'to',
        );
      }

      const updated = await tx.trip.update({
        where: { id: tripId },
        data,
      });

      if (dto.fromLat !== undefined && dto.fromLon !== undefined) {
        await this.setTripPoint(tx, tripId, 'fromPoint', dto.fromLat, dto.fromLon);
      }
      if (dto.toLat !== undefined && dto.toLon !== undefined) {
        await this.setTripPoint(tx, tripId, 'toPoint', dto.toLat, dto.toLon);
      }

      return updated;
    });
  }
}
