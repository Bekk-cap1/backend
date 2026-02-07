# Verification

## Metadata
- Date: 2026-02-07
- Base commit: `3aaf0ce` (plus working changes in this branch/worktree)
- Local Node: `v22.17.0`
- Local npm: `11.4.2`
- CI run link: fill after push (`Actions -> CI` / `Actions -> Self Verification`)

## Local checks

### Prisma generate
Command:
```bash
npm run prisma:generate
```
Result: PASS

### Lint
Command:
```bash
npm run lint
```
Result: PASS

### Build
Command:
```bash
npm run build
```
Result: PASS

### Unit + coverage gate
Command:
```bash
npm run test:cov
```
Result: PASS

Coverage summary:
- lines: `98.61`
- branches: `80`
- global gate (`lines >= 70`, `branches >= 60`): PASS

### OpenAPI generation
Command:
```bash
npm run openapi:generate
```
Result: PASS (`docs/openapi.json` refreshed)

### E2E
Commands attempted:
```bash
docker compose -f docker-compose.test.yml up -d
npm run test:e2e
```
Result: BLOCKED locally (Docker engine unavailable on this machine at run time).

Error:
- `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`

Use GitHub Actions `verify_e2e_services` job for deterministic e2e verification
without local Docker Desktop.

## Expected CI artifacts
- `openapi` (`docs/openapi.json`)
- `coverage-summary`
- `e2e-log`
- `health-metrics`
- `app-log`

## Product completion evidence covered by this change set
- Geo + realtime + Redis last location + PostGIS samples
- Routing provider abstraction + mock/test deterministic behavior + trip route/eta endpoints
- POI CRUD + nearby/along-route + community reports + moderation
- Pricing quotes persisted (`FareQuote`) + payment mark-paid + ledger + outbox events
- Cancellation quote/apply endpoints
- Admin v1 endpoints for user bans, payments, tickets, driver moderation
- Worker entrypoint (`npm run start:worker`)

## Routing ETA 404 fix verification
- Date: `2026-02-07`
- Goal: fix `GET /api/routing/trip/:tripId/eta` (`updates and fetches driver location + eta`) returning `404`.

Code changes:
- `src/modules/routing/routing.controller.ts`
  - controller prefixes changed to `['routing', 'v1/routing']`
  - now both paths are valid under global prefix:
  - `/api/routing/*`
  - `/api/v1/routing/*`
- `src/modules/routing/routing.service.ts`
  - `getTripEta()` now gracefully falls back when trip destination point is missing:
  - if city/trip geo destination is absent but driver last location exists, ETA is computed from last location instead of throwing `404`.

Commands run:
```bash
npm run lint
npm run test:e2e
```

Result:
- `lint`: PASS
- `test:e2e`: PASS

E2E output summary:
```text
PASS test/intercity.e2e-spec.ts
Test Suites: 1 passed, 1 total
Tests:       20 passed, 20 total
```

Additional hardening:
- Replaced legacy wildcard middleware route pattern to avoid `LegacyRouteConverter` warning:
  - `forRoutes('*')` -> `forRoutes({ path: '*path', method: RequestMethod.ALL })`

Note:
- Endpoint mapping is available on both `/api/routing/trip/:tripId/eta` and `/api/v1/routing/trip/:tripId/eta`.
