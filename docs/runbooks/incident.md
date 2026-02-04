# Runbook: Incident Response

## Detection
- Alerts from metrics, Sentry, or uptime checks.
- Elevated 5xx rates, latency spikes, or failing health checks.

## Triage (first 10 minutes)
1. Check `/health/live` and `/health/ready`.
2. Inspect logs for recent deploys or errors.
3. Review metrics: error rate, latency, CPU/memory, DB connections.
4. Confirm Redis/Postgres connectivity.

## Mitigation
- Roll back to previous image/tag if regression suspected.
- Scale replicas if resource exhaustion detected.
- Disable non-critical features via flags if needed.

## Resolution
- Identify root cause and apply fix.
- Re-deploy and monitor until stable.

## Post-Incident
- Create incident report: timeline, impact, RCA.
- Add tests/alerts to prevent recurrence.
