import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { MockRoutingProvider } from './providers/mock-routing.provider';
import { OsrmRoutingProvider } from './providers/osrm-routing.provider';
import {
  type Coordinate,
  type RouteResult,
  type RoutingProvider,
} from './providers/routing-provider.interface';

@Injectable()
export class RoutingService {
  private readonly provider: RoutingProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mockProvider: MockRoutingProvider,
    private readonly osrmProvider: OsrmRoutingProvider,
  ) {
    const forceMock = String(process.env.ROUTING_PROVIDER ?? '').toLowerCase();
    this.provider =
      process.env.NODE_ENV === 'test' || forceMock === 'mock'
        ? this.mockProvider
        : this.osrmProvider;
  }

  route(from: Coordinate, to: Coordinate): Promise<RouteResult> {
    return this.provider.route(from, to);
  }

  async routeAndStoreForTrip(tripId: string, from: Coordinate, to: Coordinate) {
    const route = await this.provider.route(from, to);
    await this.prisma.tripRoute.upsert({
      where: { tripId },
      create: {
        tripId,
        provider: route.provider,
        polyline: route.polyline,
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
        bbox: route.bbox,
      },
      update: {
        provider: route.provider,
        polyline: route.polyline,
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
        bbox: route.bbox,
      },
    });
    return route;
  }

  async getOrBuildTripRoute(tripId: string) {
    const existing = await this.prisma.tripRoute.findUnique({
      where: { tripId },
      select: {
        provider: true,
        polyline: true,
        distanceMeters: true,
        durationSeconds: true,
        bbox: true,
      },
    });

    if (existing) {
      return {
        provider: existing.provider,
        polyline: existing.polyline,
        distanceMeters: existing.distanceMeters,
        durationSeconds: existing.durationSeconds,
        bbox: this.parseBbox(existing.bbox),
      };
    }

    const { from, to } = await this.getTripEndpoints(tripId);
    return this.routeAndStoreForTrip(tripId, from, to);
  }

  async getTripEta(tripId: string) {
    const [last] = await this.prisma.$queryRaw<
      Array<{ lat: number; lon: number }>
    >`
      SELECT
        ST_Y(d."point"::geometry) AS "lat",
        ST_X(d."point"::geometry) AS "lon"
      FROM "DriverLocationSample" d
      WHERE d."tripId" = ${tripId}
      ORDER BY d."capturedAt" DESC
      LIMIT 1
    `;

    let destination: Coordinate;
    try {
      destination = await this.getTripDestination(tripId);
    } catch (error) {
      if (
        error instanceof NotFoundException &&
        error.message === 'Trip destination location not found' &&
        last
      ) {
        // Fallback for trips without city geo points: keep ETA endpoint reachable.
        destination = { lat: last.lat, lon: last.lon };
      } else {
        throw error;
      }
    }

    const from = last ?? (await this.getTripEndpoints(tripId)).from;
    const route = await this.routeAndStoreForTrip(tripId, from, destination);

    return {
      tripId,
      provider: route.provider,
      etaSeconds: route.durationSeconds,
      distanceMeters: route.distanceMeters,
      polyline: route.polyline,
      bbox: route.bbox,
    };
  }

  async getTripDestination(tripId: string): Promise<Coordinate> {
    const rows = await this.prisma.$queryRaw<
      Array<{ lat: number; lon: number }>
    >`
      SELECT
        ST_Y(COALESCE(t."toPoint", c."location")::geometry) AS "lat",
        ST_X(COALESCE(t."toPoint", c."location")::geometry) AS "lon"
      FROM "Trip" t
      LEFT JOIN "City" c ON c."id" = t."toCityId"
      WHERE t."id" = ${tripId}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row || row.lat === null || row.lon === null) {
      throw new NotFoundException('Trip destination location not found');
    }
    return row;
  }

  async getTripEndpoints(tripId: string): Promise<{
    from: Coordinate;
    to: Coordinate;
  }> {
    const rows = await this.prisma.$queryRaw<
      Array<{ fromLat: number; fromLon: number; toLat: number; toLon: number }>
    >`
      SELECT
        ST_Y(COALESCE(t."fromPoint", cf."location")::geometry) AS "fromLat",
        ST_X(COALESCE(t."fromPoint", cf."location")::geometry) AS "fromLon",
        ST_Y(COALESCE(t."toPoint", ct."location")::geometry) AS "toLat",
        ST_X(COALESCE(t."toPoint", ct."location")::geometry) AS "toLon"
      FROM "Trip" t
      LEFT JOIN "City" cf ON cf."id" = t."fromCityId"
      LEFT JOIN "City" ct ON ct."id" = t."toCityId"
      WHERE t."id" = ${tripId}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Trip not found');
    }

    return {
      from: { lat: row.fromLat, lon: row.fromLon },
      to: { lat: row.toLat, lon: row.toLon },
    };
  }

  private parseBbox(value: unknown): [number, number, number, number] {
    if (
      Array.isArray(value) &&
      value.length === 4 &&
      value.every((v) => typeof v === 'number')
    ) {
      return [value[0], value[1], value[2], value[3]];
    }
    return [0, 0, 0, 0];
  }
}
