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

`pnpm dev:mobile` now auto-selects a free Metro port starting from `8081`.
If `8081` is busy, it will start on `8082+` without interactive prompts.

Optional override:

```bash
EXPO_DEV_PORT=8090 pnpm dev:mobile
```

## Environment

Use `platform/apps/mobile/.env.example` as baseline.

Required:

- `EXPO_PUBLIC_API_BASE_URL`

Optional but recommended:

- `EXPO_PUBLIC_API_BASE_URL_LAN`
- `EXPO_PUBLIC_ENABLE_PUSH`
- `EXPO_PUBLIC_ENABLE_MOCKS`
- `EXPO_PUBLIC_LOCATION_UPDATE_SEC_FOREGROUND`
- `EXPO_PUBLIC_LOCATION_UPDATE_SEC_BACKGROUND`
- `EXPO_PUBLIC_NEARBY_ALERT_RADIUS_METERS`

Host values by target:

- Android emulator: `http://10.0.2.2:3000`
- iOS simulator: `http://127.0.0.1:3000`
- Physical device: `http://<YOUR_LAN_IP>:3000`

`10.0.2.2` works only in Android emulator.

## Native map and location notes

- Maps are rendered with `react-native-maps` (polyline + markers + POI/radar layers).
- Driver tracking:
- Foreground updates: `watchPositionAsync` with throttle + distance dedupe.
- Background updates: `expo-task-manager` location task with lower frequency.
- Offline location/request/offer/payment-intent actions are queued and flushed on reconnect.

## Push notifications and deep links

- On app bootstrap the app requests push permission and registers a device token.
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

## Troubleshooting

- `Cannot connect to server (10.0.2.2:3000)` on real phone:
Set `EXPO_PUBLIC_API_BASE_URL=http://<LAN_IP>:3000` in `platform/apps/mobile/.env`.
`10.0.2.2` works only for Android emulator, never for a physical device.
Make sure phone and PC are in the same Wi-Fi network.
From phone browser open `http://<LAN_IP>:3000/health/live` and confirm you get `200`.
If browser cannot reach it, backend is not reachable from LAN:
1. Start backend (`npm run start:dev`).
2. Confirm local listen with `netstat -ano | findstr :3000` (expect `0.0.0.0:3000` or `[::]:3000`).
3. Allow Node.js in Windows Firewall for private networks.

- `400 User already exists` on register:
This phone already exists in DB. Use Sign in or another number.

- `Use Admin Web` screen after login:
Logged account role is `admin/moderator/ops/finance/support/superadmin`.
Mobile app is only for `passenger/driver`.

- Blank screen on Expo web:
Restart metro with cache clear: `pnpm -C platform dev:mobile -- --clear`.

- `Port 8081 is being used` and process exits in non-interactive mode:
Fixed by auto-port script (`apps/mobile/scripts/dev.mjs`). Pull latest changes and rerun `pnpm dev:mobile`.

- CORS errors in local development:
Backend already allows all origins in local mode by default.
If needed, force-disable CORS checks via env: `CORS_DISABLED=true`.
