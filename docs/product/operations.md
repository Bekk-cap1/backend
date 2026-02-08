# Product Operations Notes

## Worker process
Outbox consumer can run in a dedicated process:

```bash
npm run start:worker
```

This process runs BullMQ consumers and outbox scheduling without exposing HTTP.

## Admin web security flow
- Web login: `POST /api/auth/web/login`
- Web refresh: `POST /api/auth/web/refresh`
- Web logout: `POST /api/auth/web/logout`

Security model:
- Refresh token is stored in `HttpOnly` cookie (`refresh_token`), not readable by JS.
- Double-submit CSRF token (`csrf_token` cookie + `x-csrf-token` header) is required for web refresh/logout.
- Access token is returned to frontend memory store and sent in `Authorization` header.
- Auth rate limits can be tuned via:
- `RATE_LIMIT_AUTH_MAX`
- `RATE_LIMIT_AUTH_LOGIN_MAX`

## Routing providers
- CI/test: deterministic mock provider (no external dependency).
- Production-like local run:
  1. `docker compose -f docker-compose.osrm.yml up -d`
  2. set `ROUTING_PROVIDER=osrm`
  3. set `OSRM_BASE_URL=http://localhost:5000`

## Radar alerts dedup
- Redis key: `radar_alert:{tripId}:{poiId}`
- TTL: `600s`

## Geo privacy and retention
- Driver location updates are throttled by Redis key:
- `geo:throttle:{tripId}:{driverId}`
- Access to trip location is restricted to trip participants or admin/moderator.
- Retention cron removes old samples from `DriverLocationSample`:
- `GEO_RETENTION_ENABLED` (default `true`)
- `GEO_RETENTION_CRON` (default `0 3 * * *`)
- `GEO_LOCATION_RETENTION_DAYS` (default `30`)

## Cancellation policy
- Fee percent: `BOOKING_CANCEL_FEE_PERCENT`
- API:
  - `GET /api/cancellations/bookings/:bookingId/quote`
  - `POST /api/cancellations/bookings/:bookingId/apply`

## Payments webhook hardening
- Webhook endpoints: `POST /api/payments/webhooks/:provider`
- Signature header is mandatory and validated with HMAC SHA-256.
- Secrets (env):
- `CLICK_WEBHOOK_SECRET`
- `PAYME_WEBHOOK_SECRET`
- `STRIPE_WEBHOOK_SECRET`
- fallback: `PAYMENT_WEBHOOK_SECRET`
- Duplicate provider events are deduplicated using `PaymentEvent.dedupeKey`.

## Payments reconciliation cron
- Cron marks stale pending/created payments as failed:
- `PAYMENT_RECONCILE_ENABLED` (default `true`)
- `PAYMENT_RECONCILE_CRON` (default `*/10 * * * *`)
- `PAYMENT_RECONCILE_STALE_MINUTES` (default `60`)
- `PAYMENT_RECONCILE_BATCH` (default `200`)
