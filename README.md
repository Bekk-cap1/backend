# Intercity Backend

Production-grade API for intercity trips: trips, requests, price negotiation, bookings, outbox, audit.

## Requirements
- Node.js 20+
- Docker (for Postgres + Redis)

## Quick Start (local)
1) `cp .env.example .env`
2) `docker compose up -d`
3) `npm ci`
4) `npm run migrate`
5) `npm run seed`
6) `npm run start:dev`

Swagger (when `SWAGGER_ENABLED=true`):
- `http://localhost:3000/api/swagger`

Health:
- `GET /api/health/live`
- `GET /api/health/ready` (checks DB + Redis)

## Scripts
- `npm run migrate` -> apply migrations to DB
- `npm run seed` -> seed minimal data
- `npm run build` -> compile
- `npm run start:dev` -> dev server
- `npm run test:e2e` -> end-to-end tests

## Environment
See `.env.example`. Required keys:
- `DATABASE_URL`, `REDIS_URL`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL` (seconds)
- `OFFERS_MAX_DRIVER`, `OFFERS_MAX_PASSENGER`

## Minimal API Contract
Auth:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Cities:
- `GET /api/cities`
- `POST /api/cities` (admin, optional)

Vehicles (driver):
- `POST /api/vehicles`
- `GET /api/vehicles/my`
- `PATCH /api/vehicles/:id`
- `DELETE /api/vehicles/:id`

Trips:
- `GET /api/trips/search`
- `GET /api/trips/:id`
- `POST /api/trips` (driver, draft)
- `PATCH /api/trips/:id` (driver, draft only)
- `POST /api/trips/:id/publish`
- `POST /api/trips/:id/start`
- `POST /api/trips/:id/complete`
- `POST /api/trips/:id/cancel`

Requests:
- `POST /api/trips/:id/requests` (passenger)
- `GET /api/requests/my` (passenger)
- `GET /api/driver/requests` (driver)
- `POST /api/requests/:id/cancel` (passenger)
- `POST /api/requests/:id/reject` (driver)
- `POST /api/requests/:id/accept` (driver)

Offers / Negotiation:
- `GET /api/requests/:id/offers`
- `POST /api/requests/:id/offers`
- `GET /api/requests/:id/negotiation`

Bookings:
- `GET /api/bookings/my` (passenger)
- `GET /api/bookings/driver` (driver, alias: `/api/driver/bookings`)
- `POST /api/bookings/:id/cancel`
- `POST /api/bookings/:id/complete`

Notifications & Realtime:
- `GET /api/notifications/my`
- `POST /api/notifications/:id/read`
- WS: `/realtime` (socket.io namespace)

Admin:
- `GET /api/admin/drivers?status=pending`
- `POST /api/admin/drivers/:id/verify`
- `POST /api/admin/drivers/:id/reject`
- `GET /api/admin/audit`

Health:
- `GET /api/health/live`
- `GET /api/health/ready`

## Definition of Done
- `docker compose up` starts Postgres + Redis + app.
- `npm run migrate && npm run seed` creates minimal data.
- Driver flow: vehicle -> draft trip -> publish.
- Passenger flow: search -> request -> 3+3 negotiation -> accept.
- Booking created and seats updated.
- Outbox event created and processed by worker.
- Health endpoints present.
- Unified error schema with requestId.
- CI runs lint + test + build + prisma validate/migrate check.
- No binary artifacts in git.

## Repository Policy (no binaries)
Do not commit:
- `dist/`, `node_modules/`, `coverage/`
- `uploads/`
- archives: `*.zip`, `*.tar`, `*.gz`, `*.rar`
- media/binaries: `*.png`, `*.jpg`, `*.jpeg`, `*.gif`, `*.pdf`, `*.mp4`, `*.mov`
- executables: `*.exe`, `*.dll`, `*.so`, `*.dylib`
- DB files: `*.sqlite`, `*.db`
- secrets: `.env`, `*.pem`, `*.key`
- logs: `*.log`
- large files: over 5MB (configurable via `FORBIDDEN_FILE_MAX_BYTES`)

## Diagrams
See `docs/diagrams.md`.

## Docs
- Architecture: `docs/architecture.md`
- API overview: `docs/api.md`

## Notes
- Branch protection should require PRs and passing CI checks.
- Request IDs are propagated via `x-request-id`.
