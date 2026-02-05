# Deployment (Kubernetes)

## Prerequisites
- Kubernetes cluster + `kubectl` access
- Namespace `intercity`
- Secrets created via `scripts/k8s/create-secrets.sh`
- GHCR image access (if repo is private)

## Create/Update secrets
```bash
NAMESPACE=intercity ENV_FILE=.env ./scripts/k8s/create-secrets.sh
```

## Migrations (Option A: Job before rollout)
Deploy uses a dedicated Job to run migrations before the app rollout.

CI step:
```bash
kubectl -n intercity delete job intercity-migrate --ignore-not-found
kubectl apply -f k8s/migrate-job.yaml
kubectl -n intercity set image job/intercity-migrate intercity-migrate=$IMAGE
kubectl -n intercity wait --for=condition=complete job/intercity-migrate --timeout=180s
```

This is idempotent: `prisma migrate deploy` can be run multiple times safely.

## Apply manifests
```bash
kubectl apply -k k8s
kubectl -n intercity set image deployment/intercity-backend intercity-backend=$IMAGE
kubectl -n intercity rollout status deployment/intercity-backend --timeout=180s
```
