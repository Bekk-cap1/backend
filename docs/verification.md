# Verification Evidence

Date: 2026-02-05 14:31:50 +05:00  
Commit: dbe1ce35947d48210425fafabb4a8ea90e335ca7  
Node: v22.17.0  
npm: 11.4.2  
CI run: TODO (link to green GitHub Actions run)

## OpenAPI
Command:
```bash
npm run openapi:generate
```
Output:
```
> backend@0.0.1 openapi:generate
> ts-node scripts/generate-openapi.ts
```

## Unit + Coverage
Command:
```bash
npm run test:cov
```
Output:
```
--------------------|---------|----------|---------|---------|-------------------
File                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
--------------------|---------|----------|---------|---------|-------------------
All files           |     100 |    92.85 |     100 |     100 |                   
 common/utils       |     100 |      100 |     100 |     100 |                   
  prisma-error.ts   |     100 |      100 |     100 |     100 |                   
  type-guards.ts    |     100 |      100 |     100 |     100 |                   
 modules/auth       |     100 |    85.71 |     100 |     100 |                   
  auth.service.ts   |     100 |    85.71 |     100 |     100 | 14                
 outbox             |     100 |      100 |     100 |     100 |                   
  outbox.service.ts |     100 |      100 |     100 |     100 |                   
--------------------|---------|----------|---------|---------|-------------------
PASS src/outbox/outbox.service.spec.ts
PASS src/modules/auth/auth.service.spec.ts
PASS src/modules/trips/trips.service.spec.ts
PASS src/modules/trips/requests/requests.service.spec.ts
PASS src/modules/offers/offers.service.spec.ts
PASS src/common/utils/prisma-error.spec.ts
PASS src/common/utils/type-guards.spec.ts

Test Suites: 7 passed, 7 total
Tests:       30 passed, 30 total
Snapshots:   0 total
Time:        2.224 s
Ran all test suites.
```

## E2E (isolated DB)
Command:
```bash
docker compose -f docker-compose.test.yml up -d
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5434/intercity_test?schema=public \
SHADOW_DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5434/intercity_shadow?schema=public \
REDIS_URL_TEST=redis://localhost:6380 \
npm run test:e2e
```
Output:
```
FAILED: Postgres is not reachable at localhost:5434 (Docker engine not running in this environment).
```

## Local health/metrics smoke
Commands:
```bash
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready
curl http://localhost:3000/metrics
```
Output:
```
TODO (run locally with the app started)
```

## K8s smoke
Commands:
```bash
kubectl apply -k k8s
kubectl apply -f k8s/migrate-job.yaml
kubectl -n <namespace> wait --for=condition=complete job/intercity-migrate --timeout=180s
kubectl -n <namespace> rollout status deployment/intercity-backend
kubectl -n <namespace> get pods -o wide
```
Output:
```
TODO (run in cluster environment)
```
