# Production Verification

## Snapshot
- Date: `2026-02-08 15:07 +05:00`
- Commit (local HEAD): `f7c6463`
- Node: `v22.17.0`
- npm: `11.4.2`
- pnpm: `10.28.2`

## Commands executed

### Backend
```bash
npm ci
npm run lint
npm run build
npm run openapi:generate
npm run test:cov
npm run test:e2e
```

### Platform
```bash
pnpm -C platform i
pnpm -C platform openapi:sync
pnpm -C platform lint
pnpm -C platform test
pnpm -C platform build
pnpm -C platform --filter admin-web test:e2e
pnpm -C platform --filter mobile test
```

### Kubernetes render
```bash
kubectl kustomize k8s/overlays/staging
kubectl kustomize k8s/overlays/prod
```

## Results

### Backend status
- `npm ci`: FAIL (local Windows `EPERM` unlink lock on native module file; known OS file-lock issue)
- `npm run lint`: PASS
- `npm run build`: PASS
- `npm run openapi:generate`: PASS
- `npm run test:cov`: PASS
  - Test suites: `9 passed`
  - Tests: `47 passed`
  - Coverage gate satisfied (`lines >= 70`, `branches >= 60`)
- `npm run test:e2e`: PASS
  - Test suites: `1 passed`
  - Tests: `22 passed`

### Platform status
- `pnpm -C platform i`: PASS
- `pnpm -C platform openapi:sync`: PASS
- `pnpm -C platform lint`: PASS
- `pnpm -C platform test`: PASS
- `pnpm -C platform build`: PASS
- `pnpm -C platform --filter admin-web test:e2e`: PASS
  - Playwright: `1 passed`
- `pnpm -C platform --filter mobile test`: PASS
  - Vitest: `5 files passed`, `16 tests passed`

### Kubernetes status
- `kubectl kustomize k8s/overlays/staging`: PASS
- `kubectl kustomize k8s/overlays/prod`: PASS

## CI workflows and expected artifacts

### Workflows
- Backend CI: `.github/workflows/ci.yml`
- Platform CI: `.github/workflows/platform-ci.yml`
- Production verification: `.github/workflows/verify-prod-pack.yml`
- Self verification: `.github/workflows/verify.yml`

### Artifacts expected in CI
- `openapi` (`docs/openapi.json`)
- `coverage-summary` (`coverage-summary.txt`)
- `e2e-log` (`e2e-log.txt`)
- `health-metrics` (`health-live.json`, `health-ready.json`, `metrics.txt`)
- `backend-prod-pack`
- `platform-prod-pack`
- `k8s-prod-pack`
- `production-verification-doc`

## Mobile release proof steps (EAS)

```bash
cd platform/apps/mobile
eas build --profile staging --platform android
eas build --profile production --platform android
# optionally iOS
eas build --profile production --platform ios
```

Device verification checklist:
1. Install staging build on real device.
2. Login as DRIVER, start active trip, verify foreground/background location updates.
3. Login as PASSENGER, verify live marker + ETA updates.
4. Register push token and validate deep link open from notification tap.

## Security baseline verified
- Auth rate limiting and brute-force lockout enabled.
- Route-level rate limits added for `geo`, `requests/offers`, `payments`.
- Webhook signature verification unit-tested (`webhook-signature.util.spec.ts`).
- Geo teleport-like jumps are ignored server-side with warning log and metrics increment.

## Legal and release docs
- Privacy: `docs/policies/PRIVACY.md`
- Terms: `docs/policies/TERMS.md`
- Internal private release process: `docs/release/RELEASE_PROCESS.md`

## CI run links (fill after push)
- Backend CI run: `<ADD_GITHUB_ACTIONS_URL>`
- Platform CI run: `<ADD_GITHUB_ACTIONS_URL>`
- Verify prod pack run: `<ADD_GITHUB_ACTIONS_URL>`
- Verify workflow run: `<ADD_GITHUB_ACTIONS_URL>`

## Notes
- After `npm ci` failed due Windows file lock (`EPERM`), local dependencies were restored with `npm install`.
- All required verification commands after restore (`lint/build/openapi/test:cov/test:e2e`) are green on this machine.
