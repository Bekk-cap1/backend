# Observability

## Logs (JSON)
Logs are emitted in JSON in production via Pino. Each HTTP request log includes:
- `requestId`
- `userId`
- `userRole`
- `method`
- `url`
- `statusCode`
- `durationMs`
- `ip`
- `userAgent`

In development, logs are pretty-printed for readability.

## Metrics (/metrics)
Prometheus metrics are exposed at `GET /metrics`. It includes:
- Default process metrics (CPU, memory, event loop, etc.)
- `http_requests_total{method,route,status}`
- `http_request_duration_ms{method,route,status}`
- `feature_events_total{feature,outcome}`

Disable metrics with `METRICS_ENABLED=false`.

Alert rules template: `docs/observability-alert-rules.yml`.

## Sentry (errors)
Sentry is enabled when `SENTRY_DSN` is set (and `SENTRY_ENABLED=true`).

Environment variables:
- `SENTRY_DSN`
- `SENTRY_ENV` (defaults to `NODE_ENV`)
- `SENTRY_RELEASE` (optional)
- `SENTRY_TRACES_SAMPLE_RATE` (default `0`)

Exceptions are captured from the global exception filter. Request context is added:
- `requestId` tag
- `role` tag
- `user.id`

## Uptime operations
Uptime and SLO guidance is documented in `docs/uptime-guidance.md`.
