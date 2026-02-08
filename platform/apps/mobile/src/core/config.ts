export const appConfig = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000',
  enableMocks: process.env.EXPO_PUBLIC_ENABLE_MOCKS === 'true',
  enableLocation: process.env.EXPO_PUBLIC_ENABLE_LOCATION !== 'false',
  enablePush: process.env.EXPO_PUBLIC_ENABLE_PUSH !== 'false',
  locationUpdateSecForeground: Number(process.env.EXPO_PUBLIC_LOCATION_UPDATE_SEC_FOREGROUND ?? '5'),
  locationUpdateSecBackground: Number(process.env.EXPO_PUBLIC_LOCATION_UPDATE_SEC_BACKGROUND ?? '15'),
  nearbyAlertRadiusMeters: Number(process.env.EXPO_PUBLIC_NEARBY_ALERT_RADIUS_METERS ?? '300'),
};
