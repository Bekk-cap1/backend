# Runbook: Kubernetes Rollback

## When to rollback
- Elevated 5xx, readiness failures, or failed smoke checks after deploy.
- Migration job succeeded but app revision is unstable.

## Fast rollback
```bash
NAMESPACE=intercity-prod
kubectl -n "$NAMESPACE" rollout undo deployment/intercity-backend
kubectl -n "$NAMESPACE" rollout status deployment/intercity-backend --timeout=300s
kubectl -n "$NAMESPACE" get pods -o wide
```

## Rollback to specific revision
```bash
NAMESPACE=intercity-prod
kubectl -n "$NAMESPACE" rollout history deployment/intercity-backend
kubectl -n "$NAMESPACE" rollout undo deployment/intercity-backend --to-revision=<REVISION>
kubectl -n "$NAMESPACE" rollout status deployment/intercity-backend --timeout=300s
```

## If migration failed
1. Stop rollout, inspect job logs:
```bash
kubectl -n "$NAMESPACE" logs job/intercity-migrate
```
2. Fix migration or env issue.
3. Re-run migration job and only then continue rollout.

## Post rollback
- Capture incident details in `docs/runbooks/incident.md`.
- Open follow-up issue with root cause and remediation tasks.
