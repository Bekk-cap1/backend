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
}
