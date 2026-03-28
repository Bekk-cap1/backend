# Mobile Development Build (Android)

Expo Go is not enough for Android push/background features in SDK 53+.  
Use a **development build (dev-client)**.

## 1) Prerequisites
- EAS account/login (`npx eas login`)
- Android device/emulator
- Backend running on LAN-reachable host

## 2) Prepare workspace
```bash
cd platform
pnpm i
pnpm openapi:sync
```

## 3) Mobile env
Create `platform/apps/mobile/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://<LAN_IP>:3000
```

Notes:
- Android emulator: `http://10.0.2.2:3000`
- iOS simulator: `http://127.0.0.1:3000`
- Physical phone: use your machine LAN IP

## 4) Build dev-client
```bash
cd platform/apps/mobile
eas build --profile development --platform android
```

Install the generated APK/AAB on device/emulator.

## 5) Run Metro for dev-client
```bash
cd platform/apps/mobile
pnpm expo start --dev-client
```

Open the installed dev-client app, then connect to Metro.

## 6) Troubleshooting
- `cannot connect to server`: verify `EXPO_PUBLIC_API_BASE_URL` points to LAN IP, not `localhost`.
- `429 too many requests`: reduce refetch frequency and avoid repeated retries.
- `401/403` after some time: refresh token flow must be enabled and backend auth cookies/tokens valid.
- If Metro stuck on used port:
  - stop old process or run `pnpm expo start --port 8082 --dev-client`.

