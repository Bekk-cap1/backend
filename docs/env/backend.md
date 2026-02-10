# Backend Environment Variables

## Runtime
- `NODE_ENV` (`development|test|production`)
- `PORT` (default `3000`)
- `API_PREFIX` (default `api`)

## Database
- `DATABASE_URL` (required)
- `SHADOW_DATABASE_URL` (required for migrations)
- `DATABASE_URL_TEST` (optional, test override)
- `SHADOW_DATABASE_URL_TEST` (optional, test override)

## Redis / queues
- `REDIS_URL` (required)
- `REDIS_URL_TEST` (optional, test override)
- `BULL_PREFIX` (optional, default `intercity`)

## Auth / sessions
- `JWT_ACCESS_SECRET` (required, strong secret)
- `JWT_REFRESH_SECRET` (required, strong secret)
- `JWT_ACCESS_TTL` (seconds)
- `JWT_REFRESH_TTL` (seconds)
- `AUTH_COOKIE_SECURE` (`true` in production)
- `AUTH_COOKIE_DOMAIN` (optional)
- `SUPERADMIN_PHONE` (optional seed/runtime guard)
- `SUPERADMIN_PASSWORD` (optional seed/runtime guard)
- `SUPERADMIN_IMMUTABLE` (`true|false`)
- `BOOTSTRAP_SUPERADMIN_PHONE` (optional one-time startup bootstrap)
- `BOOTSTRAP_SUPERADMIN_PASSWORD` (optional one-time startup bootstrap)

## CORS
- `CORS_DISABLED` (`true` disables CORS origin checks; use only for local debug)
- `CORS_STRICT_LOCAL` (`true` enforces `CORS_ORIGIN` in development/test; default is relaxed local CORS)
- `CORS_ORIGIN` (comma-separated origins)

## Rate limiting and brute-force protection
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`
- `RATE_LIMIT_AUTH_MAX`
- `RATE_LIMIT_AUTH_LOGIN_MAX`
- `LOGIN_LOCK_MAX_ATTEMPTS`
- `LOGIN_LOCK_WINDOW_SEC`

## Observability
- `LOG_LEVEL`
- `SWAGGER_ENABLED`
- `METRICS_ENABLED`
- `REALTIME_ENABLED`
- `SENTRY_ENABLED`
- `SENTRY_DSN` (optional, may be empty)
- `SENTRY_ENV`
- `SENTRY_RELEASE`
- `SENTRY_TRACES_SAMPLE_RATE`

## Geo
- `GEO_MAX_UPDATES_PER_SEC`
- `GEO_RETENTION_ENABLED`
- `GEO_RETENTION_CRON`
- `GEO_LOCATION_RETENTION_DAYS`
- `GEO_RETENTION_LOCK_SEC`

## Business rules
- `BOOKING_CANCEL_FEE_PERCENT`
- `OFFERS_MAX_DRIVER`
- `OFFERS_MAX_PASSENGER`

## Routing
- `ROUTING_PROVIDER` (`mock|osrm`)
- `OSRM_BASE_URL` (required when `ROUTING_PROVIDER=osrm`)

## Payments
- `PAYMENT_PROVIDER` (`click|payme|stripe`)
- `PAYMENT_WEBHOOK_SECRET` (required for webhook verification)
- `CLICK_WEBHOOK_SECRET`
- `PAYME_WEBHOOK_SECRET`
- `STRIPE_WEBHOOK_SECRET`
- `PAYMENT_RECONCILE_ENABLED`
- `PAYMENT_RECONCILE_CRON`
- `PAYMENT_RECONCILE_STALE_MINUTES`
- `PAYMENT_RECONCILE_BATCH`
- `PAYMENT_RECONCILE_LOCK_SEC`

## Migrations / deploy
- `MIGRATION_LOCK_KEY`
- `MIGRATION_LOCK_TIMEOUT_SEC`

## Notifications
- `TELEGRAM_ENABLED`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

## Notes
- Production must not run with placeholder secrets.
- Keep values in `.env`/secrets manager, never hardcode in source.
