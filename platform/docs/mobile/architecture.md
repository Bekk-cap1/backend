# Mobile Architecture

## App layers

- `src/app`: navigation, deep links, auth/role gates, bootstrap integrations.
- `src/ui`: theme tokens and reusable product components (cards, sheets, toasts, map overlays).
- `src/core`: config, error normalization, formatting, location services, caching, offline queue.
- `src/api`: typed API access through `@platform/api-client` and payload mappers.
- `src/stores`: auth/session store + trip/driver/passenger/negotiation state.
- `src/screens`: passenger and driver feature screens.

## Navigation model

- `AuthStack`: welcome/login/register/otp/reset-password.
- Passenger tabs: `Home`, `MyTrips`, `Alerts`, `Support`, `Profile`.
- Driver tabs: `Home`, `Trips`, `Requests`, `Alerts`, `Profile`.
- Deep link routes via scheme `intercity://` for payment/notification callbacks.

## Role policy

- `passenger`, `driver`: mobile app access.
- `admin`, `moderator`, `finance`, `support`, `ops`, `superadmin`: blocked screen with logout and redirect message.

## Geo/Routing/Radar

- Map stack uses `react-native-maps`.
- Route polyline is decoded from routing payload and rendered natively.
- Driver location is sent by foreground watcher and optional background task.
- Passenger tracking polls driver location and ETA endpoints.
- POI/radars are rendered as marker layers with on-screen toggle and alert cooldown.

## Reliability model

- Offline action queue persists critical actions in AsyncStorage.
- Queue categories: create-request, send-offer, payment-intent, update-location.
- Reconnect triggers automatic queue flush.
- Location updates are throttled and deduplicated by time + distance.

## Notifications

- Expo push token registration is sent to backend via `POST /api/notifications/devices`.
- Notification responses are converted to in-app deep links.

## Contract discipline

All backend calls go through `@platform/api-client` wrappers and `unwrapPayload/unwrapItems` mappers. No direct `fetch` is used.
