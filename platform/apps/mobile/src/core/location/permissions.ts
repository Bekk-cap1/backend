import * as Location from 'expo-location';

export async function requestForegroundLocationPermission() {
  const result = await Location.requestForegroundPermissionsAsync();
  return result.status === 'granted';
}

export async function requestBackgroundLocationPermission() {
  const result = await Location.requestBackgroundPermissionsAsync();
  return result.status === 'granted';
}

export async function ensureLocationPermissions() {
  const foreground = await requestForegroundLocationPermission();
  if (!foreground) return { foreground: false, background: false };

  const background = await requestBackgroundLocationPermission();
  return { foreground: true, background };
}
