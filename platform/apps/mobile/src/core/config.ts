import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as ExpoLinking from 'expo-linking';

function resolveExpoHost() {
  try {
    const url = ExpoLinking.createURL('/');
    const parsed = new URL(url);
    if (parsed.hostname) {
      return parsed.hostname;
    }
  } catch {
    // ignore
  }

  const expoConfigHost = Constants.expoConfig?.hostUri;
  if (expoConfigHost) {
    return expoConfigHost.split(':')[0];
  }

  const manifest = (Constants as unknown as { manifest?: { debuggerHost?: string } }).manifest;
  if (manifest?.debuggerHost) {
    return manifest.debuggerHost.split(':')[0];
  }

  const manifest2 = (Constants as unknown as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } }).manifest2;
  const debuggerHost = manifest2?.extra?.expoGo?.debuggerHost;
  if (debuggerHost) {
    return debuggerHost.split(':')[0];
  }

  const expoGoConfigHost = (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost;
  if (expoGoConfigHost) {
    return expoGoConfigHost.split(':')[0];
  }

  return null;
}

function isLoopbackHost(host: string | null | undefined) {
  return host === 'localhost' || host === '127.0.0.1';
}

function isLoopbackUrl(url: string | null | undefined) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return isLoopbackHost(parsed.hostname);
  } catch {
    return false;
  }
}

function resolveApiBaseUrl() {
  const raw = process.env.EXPO_PUBLIC_API_BASE_URL;
  const lanFallback = process.env.EXPO_PUBLIC_API_BASE_URL_LAN;
  const expoHost = resolveExpoHost();
  const expoHostApi = expoHost ? `http://${expoHost}:3000` : null;

  if (Platform.OS === 'web') {
    const browserHostApi =
      typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}:3000`
        : null;

    if (!raw) {
      return browserHostApi ?? 'http://localhost:3000';
    }

    // On web, emulator/loopback hosts often break when opened from another device.
    if (
      browserHostApi &&
      (raw.includes('10.0.2.2') || isLoopbackUrl(raw) || raw.includes('localhost'))
    ) {
      return browserHostApi;
    }

    return raw;
  }

  if (!raw) {
    if (expoHost && !isLoopbackHost(expoHost)) {
      return expoHostApi as string;
    }
    return lanFallback || 'http://10.0.2.2:3000';
  }

  // Emulator-only / loopback hosts are invalid on physical devices.
  if (raw.includes('10.0.2.2') || isLoopbackUrl(raw)) {
    if (expoHost && !isLoopbackHost(expoHost)) {
      return expoHostApi as string;
    }
    if (lanFallback && !isLoopbackUrl(lanFallback)) {
      return lanFallback;
    }
  }

  return raw;
}

export const appConfig = {
  apiBaseUrl: resolveApiBaseUrl(),
  enableMocks: process.env.EXPO_PUBLIC_ENABLE_MOCKS === 'true',
  enableLocation: process.env.EXPO_PUBLIC_ENABLE_LOCATION !== 'false',
  enablePush: process.env.EXPO_PUBLIC_ENABLE_PUSH !== 'false',
  locationUpdateSecForeground: Number(process.env.EXPO_PUBLIC_LOCATION_UPDATE_SEC_FOREGROUND ?? '5'),
  locationUpdateSecBackground: Number(process.env.EXPO_PUBLIC_LOCATION_UPDATE_SEC_BACKGROUND ?? '15'),
  nearbyAlertRadiusMeters: Number(process.env.EXPO_PUBLIC_NEARBY_ALERT_RADIUS_METERS ?? '300'),
};

if (process.env.NODE_ENV !== 'production') {
  // Helps diagnose stale Expo env cache on physical devices.
  // eslint-disable-next-line no-console
  console.log(`[mobile] API base URL resolved to ${appConfig.apiBaseUrl}`);
}
