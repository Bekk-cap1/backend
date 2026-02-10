# Platform Verification

## Run metadata

- Date: `2026-02-08 02:22:12 +05:00`
- Backend commit: `d2e080f`
- Node: `v22.17.0`
- pnpm: `10.28.2`

## Commands executed

```bash
cd platform
pnpm openapi:sync
pnpm api:coverage
pnpm lint
pnpm test
pnpm build

cd ..
npm run openapi:generate
npm run test:e2e
```

## Output excerpts

### `pnpm openapi:sync`

```text
[openapi] copied .../docs/openapi.json -> .../platform/.cache/openapi.json
[openapi] generated .../packages/shared/src/types/openapi.d.ts
[openapi] generated .../docs/API_CONTRACT.md
[openapi] generated .../docs/api-map.md
[openapi] generated .../docs/product/api-map.md
[openapi] generated .../docs/api-gaps.md
[openapi] generated .../packages/shared/src/constants/api-gaps.generated.ts
```

### `pnpm api:coverage`

```text
[coverage] generated platform/docs/api-coverage.md
[coverage] generated platform/docs/api-coverage.json
```

### `pnpm lint`

```text
Packages in scope: @platform/api-client, @platform/config, @platform/shared, @platform/ui, admin-web, mobile
Tasks: 6 successful, 6 total
```

### `pnpm test`

```text
@platform/shared:test: 1 passed (7 tests)
@platform/api-client:test: 3 passed (5 tests)
admin-web:test: add UI tests later
mobile:test: add component tests later
Tasks: 6 successful, 6 total
```

### `pnpm build`

```text
Tasks: 6 successful, 6 total
admin-web routes include:
/dashboard /live /users /users/[id] /drivers /drivers/[id] /trips /trips/[id]
/bookings /bookings/[id] /cancellations /poi /poi-reports /tickets /tickets/[id]
/payments /payments/[id] /notifications /audit /settings /login
```

### `npm run openapi:generate`

```text
Generated Prisma Client (v7.2.0)
scripts/generate-openapi.ts completed
```

### `npm run test:e2e`

```text
PASS test/intercity.e2e-spec.ts
Tests: 20 passed, 20 total
```

## API coverage and gaps

- Coverage report: `platform/docs/api-coverage.md`
- Coverage JSON: `platform/docs/api-coverage.json`
- API map: `platform/docs/api-map.md`
- API gaps: `platform/docs/api-gaps.md`

Current status:

- `api-gaps.md`: **No API gaps detected**

## Local run config

- Backend: `http://localhost:3000`
- Admin web: `http://localhost:3100`
- Mobile API base (`EXPO_PUBLIC_API_BASE_URL`):
- Android emulator: `http://10.0.2.2:3000`
- iOS simulator: `http://127.0.0.1:3000`
- Physical device: `http://<LAN_IP>:3000`

