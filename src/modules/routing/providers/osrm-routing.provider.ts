import { BadGatewayException, Injectable } from '@nestjs/common';
import {
  type Coordinate,
  type RouteResult,
  type RoutingProvider,
} from './routing-provider.interface';

type OsrmResponse = {
  code: string;
  routes?: Array<{
    geometry: string;
    distance: number;
    duration: number;
  }>;
};

@Injectable()
export class OsrmRoutingProvider implements RoutingProvider {
  readonly name = 'osrm';
  private readonly baseUrl =
    process.env.OSRM_BASE_URL ?? 'http://router.project-osrm.org';

  async route(from: Coordinate, to: Coordinate): Promise<RouteResult> {
    const url =
      `${this.baseUrl}/route/v1/driving/` +
      `${from.lon},${from.lat};${to.lon},${to.lat}` +
      '?overview=full&geometries=polyline';

    const res = await fetch(url);
    if (!res.ok) {
      throw new BadGatewayException(`OSRM error: ${res.status}`);
    }
    const body = (await res.json()) as OsrmResponse;
    if (body.code !== 'Ok' || !body.routes?.length) {
      throw new BadGatewayException('OSRM returned empty route');
    }

    const route = body.routes[0];
    const bbox: [number, number, number, number] = [
      Math.min(from.lon, to.lon),
      Math.min(from.lat, to.lat),
      Math.max(from.lon, to.lon),
      Math.max(from.lat, to.lat),
    ];

    return {
      provider: this.name,
      polyline: route.geometry,
      distanceMeters: Math.round(route.distance),
      durationSeconds: Math.round(route.duration),
      bbox,
    };
  }
}
