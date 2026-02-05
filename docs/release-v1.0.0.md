# Release v1.0.0

## Deploy
- Kubernetes deploy with migration Job before rollout.
- Runtime hardening in deployment (securityContext, read-only root, /tmp).

## Observability
- JSON structured logging with requestId + latency.
- `/metrics` Prometheus endpoint.
- `/health/live` and `/health/ready` endpoints.
- Sentry integration.

## Quality
- CI runs lint, unit with coverage gates, e2e, build.
- Coverage thresholds enforced in Jest.

## Runbooks
- Backup/restore scripts and incident runbook.

## OpenAPI
- OpenAPI generated via `npm run openapi:generate`.
- CI uploads `docs/openapi.json` as artifact.

## Repo hygiene
- LICENSE, SECURITY, CONTRIBUTING, CODE_OF_CONDUCT, CHANGELOG.
- `.env.example` with documented variables.

Verification evidence: `docs/verification.md`
