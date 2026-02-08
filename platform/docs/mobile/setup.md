# Mobile Setup

## Prerequisites

- Node 22+
- pnpm 10+
- Expo CLI via `npx expo`
- Backend API running on `http://localhost:3000`
- Android Studio emulator and/or iOS simulator
- For background location + push on device: Expo development build (EAS), not Expo Go

## Install and Run

```bash
cd platform
pnpm i
pnpm openapi:sync
pnpm dev:mobile
```

## Environment

Use `platform/apps/mobile/.env.example` as baseline.

Required:

- `EXPO_PUBLIC_API_BASE_URL`

Recommended:

- `EXPO_PUBLIC_ENABLE_PUSH`
- `EXPO_PUBLIC_ENABLE_MOCKS`
- `EXPO_PUBLIC_LOCATION_UPDATE_SEC_FOREGROUND`
- `EXPO_PUBLIC_LOCATION_UPDATE_SEC_BACKGROUND`
- `EXPO_PUBLIC_NEARBY_ALERT_RADIUS_METERS`

Host values by target:

- Android emulator: `http://10.0.2.2:3000`
- iOS simulator: `http://127.0.0.1:3000`
- Physical device: `http://<YOUR_LAN_IP>:3000`

## Native map and location notes

- Maps are rendered with `react-native-maps` (polyline + markers + POI/radar layers).
- Driver tracking:
- Foreground updates: `watchPositionAsync` with throttle + distance dedupe.
- Background updates: `expo-task-manager` location task with lower frequency.
- Offline location/request/offer/payment-intent actions are queued and flushed on reconnect.

## Push notifications and deep links

- On app bootstrap the app requests push permission and registers a device token via `POST /api/notifications/devices`.
- Notification tap deep links are routed through app scheme `intercity://`.
- Verify backend has CORS and auth config for your mobile base URL.
- Full provider setup guide: `platform/docs/mobile/push-setup.md`.

## EAS Profiles

`apps/mobile/eas.json` profiles:

- `development`
- `staging`
- `production`

Examples:

```bash
cd platform/apps/mobile
eas build --platform android --profile development
eas build --platform android --profile staging
eas build --platform ios --profile production
```

## Quick Smoke

1. Login as passenger and verify `Home -> Search -> Trip details`.
2. Create request and verify negotiation timeline updates.
3. Login as driver and verify `Active trip` map + `Sharing ON` indicator.
4. Trigger offline mode and verify queued actions flush after reconnect.
5. Verify admin role is blocked with `Use Admin Web` screen.
