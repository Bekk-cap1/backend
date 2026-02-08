# Mobile Push Setup

## Prerequisites
- Expo project configured with `expo-notifications`.
- Backend endpoint `POST /api/notifications/devices` enabled.
- Deep link scheme configured as `intercity://`.

## Android (FCM)
1. Create Firebase project and Android app.
2. Add FCM server key/credentials to Expo/EAS.
3. Build a development or staging build with EAS.
4. Grant notification permission on device.

## iOS (APNS)
1. Configure Apple Push key/certificate in Expo project.
2. Ensure bundle identifier matches EAS config.
3. Build iOS app via EAS and install on device.

## Runtime verification
1. Login in mobile app.
2. Confirm device registration call to `/api/notifications/devices` returns success.
3. Send test notification.
4. Tap notification and verify deep link opens target screen.

## Troubleshooting
- No token: check permissions and native build (Expo Go limitations).
- No delivery: verify Expo credentials and backend push provider config.
- Wrong navigation: inspect deep link payload keys (`bookingId`, `tripId`).
