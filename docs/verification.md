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
