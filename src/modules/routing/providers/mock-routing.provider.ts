import { Injectable } from '@nestjs/common';
import {
  type Coordinate,
  type RouteResult,
  type RoutingProvider,
} from './routing-provider.interface';

@Injectable()
export class MockRoutingProvider implements RoutingProvider {
  readonly name = 'mock';

  route(from: Coordinate, to: Coordinate): Promise<RouteResult> {
    const distanceMeters = this.haversineMeters(from, to);
    // deterministic speed ~= 50km/h for stable CI tests
    const durationSeconds = Math.max(1, Math.round(distanceMeters / 13.89));
    const bbox: [number, number, number, number] = [
      Math.min(from.lon, to.lon),
      Math.min(from.lat, to.lat),
      Math.max(from.lon, to.lon),
      Math.max(from.lat, to.lat),
    ];

    return Promise.resolve({
      provider: this.name,
      polyline: `${from.lat},${from.lon};${to.lat},${to.lon}`,
      distanceMeters,
      durationSeconds,
      bbox,
    });
  }

  private haversineMeters(a: Coordinate, b: Coordinate): number {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const r = 6_371_000;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return Math.round(r * c);
  }
}
