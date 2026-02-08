# Observability Runbook

## Core signals
- Logs: structured JSON with requestId, userId, status, latency.
- Metrics endpoint: `/metrics`.
- Health endpoints: `/health/live`, `/health/ready`.
- Error tracking: Sentry (when `SENTRY_DSN` configured).

## Alerts baseline
- 5xx error rate spike.
- p95 latency degradation.
- Database/Redis readiness failures.
- Payment webhook verification failures.
- Geo update rejection spikes (teleport/rate-limit anomalies).

## On-call triage
1. Check `/health/ready` and deployment rollout status.
2. Inspect metrics for `http_requests_total` and latency histograms.
3. Correlate with logs by `requestId`.
4. Inspect Sentry issues grouped by release.
5. If payment incident: run reconciliation report and replay safe operations.

## Escalation
- If data integrity risk is detected, stop rollout and apply rollback runbook.
- Document incident timeline in `docs/runbooks/incidents.md`.
