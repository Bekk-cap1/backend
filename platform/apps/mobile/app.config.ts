import appJson from './app.json';

const expo = appJson.expo;
const iosBundleIdentifier =
  process.env.IOS_BUNDLE_IDENTIFIER ?? 'com.intercity.mobile';
const androidPackage = process.env.ANDROID_PACKAGE ?? 'com.intercity.mobile';

export default {
  ...expo,
  ios: {
    ...(expo.ios ?? {}),
    bundleIdentifier: iosBundleIdentifier,
    supportsTablet: true,
    infoPlist: {
      ...(expo.ios?.infoPlist ?? {}),
      NSLocationWhenInUseUsageDescription:
        'Intercity uses your location during active trips for ETA and safety.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'Intercity uses background location for active trip tracking.',
      UIBackgroundModes: ['location', 'fetch', 'remote-notification'],
    },
  },
  android: {
    ...(expo.android ?? {}),
    package: androidPackage,
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'FOREGROUND_SERVICE',
      'POST_NOTIFICATIONS',
    ],
  },
  extra: {
    appEnv: process.env.APP_ENV ?? 'development',
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
    sentryRelease: process.env.SENTRY_RELEASE ?? '',
  },
};
