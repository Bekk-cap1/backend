# Uptime Guidance

## Health checks
- Liveness: `GET /health/live`
- Readiness: `GET /health/ready` (DB + Redis dependency check)
- Metrics: `GET /metrics`

## Recommended external uptime checks
- Check `/health/live` every 30s from 2+ regions.
- Check `/health/ready` every 60s from at least 1 internal network probe.
- Alert on:
- 3 consecutive liveness failures
- readiness failures > 5 minutes
- p95 latency > 800ms for 10 minutes

## SLO suggestion
- Availability SLO: 99.9% monthly for `/health/live`.
- API latency SLO: 95% of requests under 500ms.

## Incident routing
- Critical (availability): on-call backend + DevOps.
- Warning (latency/errors): create incident ticket and triage in <30 min.
