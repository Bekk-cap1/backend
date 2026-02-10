# Verification

## Metadata
- Date: 2026-02-08
- Base commit: `fe90c3c` (plus working changes in this branch/worktree)
- Local Node: `v22.17.0`
- Local npm: `11.4.2`
- Local pnpm: `10.28.2`
- CI run link: fill after push (`Actions -> CI` / `Actions -> Verify Production Launch Pack`)

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
- lines: `98.92`
- branches: `80`
- global gate (`lines >= 70`, `branches >= 60`): PASS

### OpenAPI generation
Command:
```bash
npm run openapi:generate
```
Result: PASS (`docs/openapi.json` refreshed)

### E2E
Command:
```bash
npm run test:e2e
```
Result: PASS

E2E summary:
```text
PASS test/intercity.e2e-spec.ts
Test Suites: 1 passed, 1 total
Tests:       23 passed, 23 total
```

Security check covered by e2e:
- repeated invalid `/api/auth/login` attempts are locked with `429`.
- repeated `mark-paid` with the same idempotency key returns idempotent success.

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

## Routing ETA and lockout verification
- `GET /api/routing/trip/:tripId/eta` is covered by e2e test `updates and fetches driver location + eta` and returns `200`.
- Login brute-force lockout is covered by e2e test `rate-limits repeated failed logins with 429`.
- Superadmin safety flow is covered by e2e test `supports superadmin reauth, impersonation and dangerous delete with audit`.
