import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import type { LocationPoint } from './foreground';
import { appConfig } from '../config';

export const DRIVER_BACKGROUND_TASK = 'intercity-driver-location-task';

let backgroundHandler: ((point: LocationPoint) => Promise<void>) | null = null;

if (!TaskManager.isTaskDefined(DRIVER_BACKGROUND_TASK)) {
  TaskManager.defineTask(DRIVER_BACKGROUND_TASK, async ({ data, error }) => {
    if (error || !data || !backgroundHandler) return;

    const payload = data as { locations?: Location.LocationObject[] };
    const latest = payload.locations?.[payload.locations.length - 1];
    if (!latest) return;

    const speed = latest.coords.speed;
    const heading = latest.coords.heading;

    await backgroundHandler({
      lat: latest.coords.latitude,
      lon: latest.coords.longitude,
      speedKmh: typeof speed === 'number' && speed >= 0 ? speed * 3.6 : undefined,
      headingDeg: typeof heading === 'number' && heading >= 0 ? heading : undefined,
      capturedAt: latest.timestamp,
    });
  });
}

export function setBackgroundLocationHandler(handler: ((point: LocationPoint) => Promise<void>) | null) {
  backgroundHandler = handler;
}

export async function startBackgroundLocationTask() {
  const started = await Location.hasStartedLocationUpdatesAsync(DRIVER_BACKGROUND_TASK);
  if (started) return;

  await Location.startLocationUpdatesAsync(DRIVER_BACKGROUND_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: appConfig.locationUpdateSecBackground * 1000,
    distanceInterval: 50,
    pausesUpdatesAutomatically: true,
    foregroundService: {
      notificationTitle: 'Intercity location sharing',
      notificationBody: 'Location updates are active for your trip.',
      notificationColor: '#4F7CFF',
    },
  });
}

export async function stopBackgroundLocationTask() {
  const started = await Location.hasStartedLocationUpdatesAsync(DRIVER_BACKGROUND_TASK);
  if (!started) return;
  await Location.stopLocationUpdatesAsync(DRIVER_BACKGROUND_TASK);
}
