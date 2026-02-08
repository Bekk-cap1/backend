import { haversineMeters } from './geoMath';

export type LocationPoint = {
  lat: number;
  lon: number;
  speedKmh?: number;
  headingDeg?: number;
  capturedAt?: number;
};

export type LocationSendState = {
  point: LocationPoint;
  sentAt: number;
};

export function shouldSendLocation(
  last: LocationSendState | null,
  next: LocationPoint,
  options: { minIntervalMs: number; minDistanceMeters: number },
): boolean {
  if (!last) return true;

  const nextTs = next.capturedAt ?? Date.now();
  const deltaMs = nextTs - last.sentAt;

  if (deltaMs >= options.minIntervalMs) {
    return true;
  }

  const distance = haversineMeters(last.point.lat, last.point.lon, next.lat, next.lon);
  return distance >= options.minDistanceMeters;
}
