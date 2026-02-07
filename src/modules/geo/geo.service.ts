import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Role } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { RoutingService } from '../routing/routing.service';
import { RadarAlertService } from '../poi/radar-alert.service';
import { UpdateDriverLocationDto } from './dto/update-driver-location.dto';

type LastLocation = {
  tripId: string;
  driverId: string;
  lat: number;
  lon: number;
  speedKmh?: number | null;
  headingDeg?: number | null;
  capturedAt: string;
};

@Injectable()
export class GeoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly realtime: RealtimeGateway,
    private readonly routing: RoutingService,
    private readonly radar: RadarAlertService,
  ) {}

  async updateDriverLocationByDriver(
    driverId: string,
    tripId: string,
    dto: UpdateDriverLocationDto,
  ) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { id: true, driverId: true },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.driverId !== driverId) {
      throw new ForbiddenException('Only trip driver can update location');
    }

    const capturedAt = new Date().toISOString();
    await this.prisma.$executeRaw`
      INSERT INTO "DriverLocationSample" (
        "id","tripId","driverId","point","speedKmh","headingDeg","capturedAt","createdAt"
      )
      VALUES (
        ${randomUUID()},
        ${tripId},
        ${driverId},
        ST_SetSRID(ST_MakePoint(${dto.lon}, ${dto.lat}), 4326)::geography,
        ${dto.speedKmh ?? null},
        ${dto.headingDeg ?? null},
        NOW(),
        NOW()
      )
    `;

    const payload: LastLocation = {
      tripId,
      driverId,
      lat: dto.lat,
      lon: dto.lon,
      speedKmh: dto.speedKmh ?? null,
      headingDeg: dto.headingDeg ?? null,
      capturedAt,
    };

    await this.redis.raw.set(
      this.lastLocationKey(tripId),
      JSON.stringify(payload),
      'EX',
      60 * 60 * 24,
    );

    const users = await this.getTripParticipantIds(tripId);
    this.realtime.emitToUsers(users, 'trip.driver.location', payload);
    await this.radar.handleLocation(tripId, dto.lat, dto.lon);

    return payload;
  }

  async getTripLastLocationForUser(
    tripId: string,
    userId: string,
    role?: Role,
  ) {
    await this.assertViewerAccess(tripId, userId, role);

    const cached = await this.redis.raw.get(this.lastLocationKey(tripId));
    if (cached) {
      return JSON.parse(cached) as LastLocation;
    }

    const row = await this.getLastLocationFromDb(tripId);
    if (!row) throw new NotFoundException('Driver location not found');

    return row;
  }

  async getTripEtaForUser(tripId: string, userId: string, role?: Role) {
    await this.assertViewerAccess(tripId, userId, role);
    const last = await this.getTripLastLocationForUser(tripId, userId, role);
    const destination = await this.routing.getTripDestination(tripId);
    const route = await this.routing.routeAndStoreForTrip(
      tripId,
      { lat: last.lat, lon: last.lon },
      destination,
    );

    return {
      tripId,
      etaSeconds: route.durationSeconds,
      distanceMeters: route.distanceMeters,
      provider: route.provider,
    };
  }

  private async getLastLocationFromDb(
    tripId: string,
  ): Promise<LastLocation | null> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        tripId: string;
        driverId: string;
        lat: number;
        lon: number;
        speedKmh: number | null;
        headingDeg: number | null;
        capturedAt: Date;
      }>
    >`
      SELECT
        d."tripId",
        d."driverId",
        ST_Y(d."point"::geometry) AS "lat",
        ST_X(d."point"::geometry) AS "lon",
        d."speedKmh",
        d."headingDeg",
        d."capturedAt"
      FROM "DriverLocationSample" d
      WHERE d."tripId" = ${tripId}
      ORDER BY d."capturedAt" DESC
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      tripId: row.tripId,
      driverId: row.driverId,
      lat: row.lat,
      lon: row.lon,
      speedKmh: row.speedKmh,
      headingDeg: row.headingDeg,
      capturedAt: row.capturedAt.toISOString(),
    };
  }

  private async assertViewerAccess(
    tripId: string,
    userId: string,
    role?: Role,
  ) {
    if (role === Role.admin || role === Role.moderator) return;
    const ids = await this.getTripParticipantIds(tripId);
    if (!ids.includes(userId)) {
      throw new ForbiddenException('Only trip participants can view location');
    }
  }

  private async getTripParticipantIds(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        driverId: true,
        requests: { select: { passengerId: true } },
      },
    });
    if (!trip) throw new NotFoundException('Trip not found');

    const out = new Set<string>([trip.driverId]);
    for (const req of trip.requests) out.add(req.passengerId);
    return [...out];
  }

  private lastLocationKey(tripId: string) {
    return `geo:last:trip:${tripId}`;
  }
}
