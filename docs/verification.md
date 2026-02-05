## CI Self-Verification
This repo includes a self-verification workflow: `.github/workflows/verify.yml`.
Run via GitHub Actions (workflow_dispatch) to produce evidence without local Docker Desktop.

Expected artifacts:
- `openapi` (docs/openapi.json)
- `coverage-summary`
- `e2e-log`
- `health-metrics`
- `app-log`

CI run link: TODO (fill after successful run)

Summary:
- unit/openapi: TODO
- e2e (3x): TODO
- health/metrics: TODO
- k8s: TODO (optional)
