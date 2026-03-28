import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
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
import { MetricsService } from '../metrics/metrics.service';

type LastLocation = {
  tripId: string;
  driverId: string;
  lat: number;
  lon: number;
  speedKmh?: number | null;
  headingDeg?: number | null;
  capturedAt: string;
};

type NominatimSearchRow = {
  place_id: number | string;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: Record<string, string | undefined>;
};

type NominatimReverseRow = {
  place_id: number | string;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: Record<string, string | undefined>;
};

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly realtime: RealtimeGateway,
    private readonly routing: RoutingService,
    private readonly radar: RadarAlertService,
    private readonly metrics: MetricsService,
  ) {}

  async autocompletePlaces(params: {
    q: string;
    limit?: number;
    lat?: number;
    lon?: number;
  }) {
    const query = params.q.trim();
    if (query.length < 2) return { items: [] };

    const limit = Math.min(Math.max(params.limit ?? 6, 1), 10);
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', String(limit));

    if (
      Number.isFinite(params.lat) &&
      Number.isFinite(params.lon)
    ) {
      // Bias search around current viewport center.
      const lon = Number(params.lon);
      const lat = Number(params.lat);
      url.searchParams.set('viewbox', `${lon - 1},${lat + 1},${lon + 1},${lat - 1}`);
      url.searchParams.set('bounded', '0');
    }

    let rows: NominatimSearchRow[] = [];
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'IntercityBackend/1.0 (support@intercity.local)',
          'Accept-Language': 'ru,en',
        },
      });
      if (!response.ok) {
        throw new Error(`Provider error: ${response.status}`);
      }
      rows = (await response.json()) as NominatimSearchRow[];
    } catch {
      throw new BadRequestException('Address autocomplete provider unavailable');
    }

    return {
      items: rows
        .map((row) => {
          const lat = Number(row.lat);
          const lon = Number(row.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
          const subtitle =
            row.address?.city ??
            row.address?.town ??
            row.address?.village ??
            row.address?.state ??
            row.address?.country ??
            '';
          return {
            id: String(row.place_id),
            title: row.name || row.display_name.split(',')[0]?.trim() || row.display_name,
            subtitle: subtitle || undefined,
            displayName: row.display_name,
            lat,
            lon,
          };
        })
        .filter((value): value is NonNullable<typeof value> => value !== null),
    };
  }

  async reverseGeocode(params: { lat: number; lon: number }) {
    if (!Number.isFinite(params.lat) || !Number.isFinite(params.lon)) {
      throw new BadRequestException('lat/lon must be valid numbers');
    }

    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', String(params.lat));
    url.searchParams.set('lon', String(params.lon));
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');

    let row: NominatimReverseRow;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'IntercityBackend/1.0 (support@intercity.local)',
          'Accept-Language': 'ru,en',
        },
      });
      if (!response.ok) {
        throw new Error(`Provider error: ${response.status}`);
      }
      row = (await response.json()) as NominatimReverseRow;
    } catch {
      throw new BadRequestException('Address reverse geocode unavailable');
    }

    const lat = Number(row.lat);
    const lon = Number(row.lon);

    return {
      id: String(row.place_id),
      title: row.name || row.display_name.split(',')[0]?.trim() || row.display_name,
      subtitle:
        row.address?.city ??
        row.address?.town ??
        row.address?.village ??
        row.address?.state ??
        row.address?.country ??
        undefined,
      displayName: row.display_name,
      lat: Number.isFinite(lat) ? lat : params.lat,
      lon: Number.isFinite(lon) ? lon : params.lon,
    };
  }

  async updateDriverLocationByDriver(
    driverId: string,
    tripId: string,
    dto: UpdateDriverLocationDto,
  ) {
    await this.assertUpdateRateLimit(tripId, driverId);
    const lastKnown = await this.getLastKnownLocation(tripId);
    if (this.isTeleportJump(lastKnown, dto.lat, dto.lon)) {
      this.logger.warn(
        `Ignoring teleport-like location jump for trip=${tripId} driver=${driverId}`,
      );
      this.metrics.incFeature('geo_teleport_ignored');
      if (lastKnown) {
        return lastKnown;
      }
    }

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
    this.metrics.incFeature('geo_location_update');

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

  private async getLastKnownLocation(
    tripId: string,
  ): Promise<LastLocation | null> {
    const cached = await this.redis.raw.get(this.lastLocationKey(tripId));
    if (!cached) return null;
    try {
      return JSON.parse(cached) as LastLocation;
    } catch {
      return null;
    }
  }

  private isTeleportJump(
    last: LastLocation | null,
    nextLat: number,
    nextLon: number,
  ): boolean {
    if (!last) return false;

    const lastTs = Date.parse(last.capturedAt);
    if (!Number.isFinite(lastTs)) return false;

    const elapsedSec = Math.max(1, (Date.now() - lastTs) / 1000);
    const distanceMeters = this.haversineMeters(
      last.lat,
      last.lon,
      nextLat,
      nextLon,
    );

    // Ignore implausible spikes produced by bad GPS fixes.
    const speedKmh = distanceMeters / 1000 / (elapsedSec / 3600);
    const maxSpeedKmh = Number(process.env.GEO_MAX_SPEED_KMH ?? 220);
    return speedKmh > maxSpeedKmh;
  }

  private haversineMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371_000 * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  private async assertUpdateRateLimit(tripId: string, driverId: string) {
    const maxPerSecond = Number(process.env.GEO_MAX_UPDATES_PER_SEC ?? 5);
    const key = `geo:throttle:${tripId}:${driverId}`;
    const count = await this.redis.raw.incr(key);
    if (count === 1) {
      await this.redis.raw.expire(key, 1);
    }

    if (count > maxPerSecond) {
      throw new HttpException(
        'Too many location updates',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
