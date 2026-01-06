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
- `GET /health/live`
- `GET /health/ready` (checks DB + Redis)

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
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

Cities:
- `GET /cities`
- `POST /cities` (admin, optional)

Vehicles (driver):
- `POST /vehicles`
- `GET /vehicles/my`
- `PATCH /vehicles/:id`
- `DELETE /vehicles/:id`

Trips:
- `GET /trips/search`
- `GET /trips/:id`
- `POST /trips` (driver, draft)
- `PATCH /trips/:id` (driver, draft only)
- `POST /trips/:id/publish`
- `POST /trips/:id/start`
- `POST /trips/:id/complete`
- `POST /trips/:id/cancel`

Requests:
- `POST /trips/:id/requests` (passenger)
- `GET /requests/my` (passenger)
- `GET /driver/requests` (driver)
- `POST /requests/:id/cancel` (passenger)
- `POST /requests/:id/reject` (driver)
- `POST /requests/:id/accept` (driver)

Offers / Negotiation:
- `GET /requests/:id/offers`
- `POST /requests/:id/offers`
- `GET /requests/:id/negotiation`

Bookings:
- `GET /bookings/my` (passenger)
- `GET /bookings/driver` (driver, alias: `/driver/bookings`)
- `POST /bookings/:id/cancel`
- `POST /bookings/:id/complete`

Notifications & Realtime:
- `GET /notifications/my`
- `POST /notifications/:id/read`
- WS: `/ws` (token auth)

Admin:
- `GET /admin/drivers?status=pending`
- `POST /admin/drivers/:id/verify`
- `POST /admin/drivers/:id/reject`
- `GET /admin/audit`

Health:
- `GET /health/live`
- `GET /health/ready`

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
