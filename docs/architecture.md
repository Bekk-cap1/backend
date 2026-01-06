# Architecture

Intercity is a NestJS monolith with clear domain modules and an outbox-based event pipeline.

## Modules
- `auth`: register/login/refresh/logout, JWT guards.
- `accounts`: users + profiles.
- `drivers`: driver profile, verification status.
- `vehicles`: CRUD for driver vehicles.
- `trips`: trip lifecycle (draft -> published -> started -> completed/canceled).
- `requests`: trip requests + negotiation sessions.
- `offers`: price negotiation turns and limits.
- `bookings`: booking creation/cancel/complete.
- `payments` (optional): payment intents + webhook processing.
- `outbox`: transactional events + dispatcher + worker.
- `audit`: audit log for critical actions.
- `notifications`: outbox consumer creates notifications.

## Data flow (write path)
1) Command (HTTP) enters controller.
2) Service validates ownership + role, then starts a Prisma transaction.
3) Domain change is persisted.
4) Outbox event is created in the same transaction.
5) Transaction commits.

## Outbox pipeline
1) Scheduler triggers dispatcher every few seconds.
2) Dispatcher locks pending outbox rows and enqueues jobs into BullMQ.
3) Worker consumes jobs, writes notifications, and emits WS events (if enabled).
4) Outbox row is updated with status, retries, and nextRetryAt.

## Concurrency model
- Negotiation is enforced with DB locks in a transaction.
- Each offer validates turn order and remaining limits.
- Accept writes finalPrice + creates booking atomically.

## Observability
- `RequestIdMiddleware` assigns `x-request-id` for every request.
- Global response and error envelopes include `requestId`.
- Structured logger with level from env.

## Security
- Helmet, CORS allowlist, rate limits (global + auth/admin).
- JWT access/refresh with rotation.
- Ownership checks in services.

## Health
- `/health/live`: liveness
- `/health/ready`: Postgres + Redis readiness
