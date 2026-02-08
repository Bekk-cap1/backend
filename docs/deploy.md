# Deployment (Kubernetes)

## Prerequisites
- Kubernetes cluster + `kubectl` access
- Namespace per environment (`intercity-staging`, `intercity-prod`)
- Secrets created via `scripts/k8s/create-secrets.sh`
- GHCR image access (if repo is private)

## Create/Update secrets
```bash
NAMESPACE=intercity ENV_FILE=.env ./scripts/k8s/create-secrets.sh
```

## Environment overlays
Use kustomize overlays:

- `k8s/overlays/staging`
- `k8s/overlays/prod`

Examples:

```bash
kubectl apply -k k8s/overlays/staging
kubectl apply -k k8s/overlays/prod
```

## Migrations (safe Job with advisory lock)
Deploy uses a dedicated Job to run migrations before rollout. The job runs `scripts/migrate-with-lock.js` and acquires a Postgres advisory lock.

CI step:
```bash
kubectl -n "$NAMESPACE" delete job intercity-migrate --ignore-not-found
kubectl apply -f k8s/migrate-job.yaml
kubectl -n "$NAMESPACE" set image job/intercity-migrate intercity-migrate="$IMAGE"
kubectl -n "$NAMESPACE" wait --for=condition=complete job/intercity-migrate --timeout=300s
```

This is idempotent: `prisma migrate deploy` can be run multiple times safely.

## Apply manifests
```bash
kubectl apply -k "k8s/overlays/${ENVIRONMENT}"
kubectl -n "$NAMESPACE" set image deployment/intercity-backend intercity-backend="$IMAGE"
kubectl -n "$NAMESPACE" rollout status deployment/intercity-backend --timeout=300s
```

## Rollback
See `docs/runbooks/rollback.md`.
