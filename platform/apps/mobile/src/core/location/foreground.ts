import * as Location from 'expo-location';
import { appConfig } from '../config';

export type LocationPoint = {
  lat: number;
  lon: number;
  headingDeg?: number;
  speedKmh?: number;
  capturedAt?: number;
};

function toLocationPoint(position: Location.LocationObject): LocationPoint {
  const speed = position.coords.speed;
  const heading = position.coords.heading;

  return {
    lat: position.coords.latitude,
    lon: position.coords.longitude,
    speedKmh: typeof speed === 'number' && speed >= 0 ? speed * 3.6 : undefined,
    headingDeg: typeof heading === 'number' && heading >= 0 ? heading : undefined,
    capturedAt: position.timestamp,
  };
}

export async function startForegroundTracking(
  onPoint: (point: LocationPoint) => Promise<void> | void,
): Promise<() => void> {
  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 25,
      timeInterval: appConfig.locationUpdateSecForeground * 1000,
      mayShowUserSettingsDialog: true,
    },
    async (position) => {
      await onPoint(toLocationPoint(position));
    },
  );

  return () => {
    subscription.remove();
  };
}

export function normalizeLocationPoint(point: LocationPoint) {
  return {
    lat: Number(point.lat),
    lon: Number(point.lon),
    speedKmh: point.speedKmh,
    headingDeg: point.headingDeg,
  };
}
