# Mobile Setup

## Prerequisites

- Node 22+
- pnpm 10+
- Expo CLI via `npx expo`
- Backend API running at `http://localhost:3000`

## Install and Run

```bash
cd platform
pnpm i
pnpm openapi:sync
pnpm dev:mobile
```

Scan QR in Expo Go or run emulator.

## Required env

Set Expo public env before start:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

Use target-specific host values:

- Android emulator: `http://10.0.2.2:3000`
- iOS simulator: `http://127.0.0.1:3000`
- Physical device: `http://<YOUR_LAN_IP>:3000`

## EAS build profiles

`apps/mobile/eas.json` includes:
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

Sentry env values:
- `EXPO_PUBLIC_SENTRY_DSN`
- `SENTRY_RELEASE`
