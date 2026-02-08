# Internal Release Process (Private Repository)

## Release model
- Repository visibility: private.
- Container registry visibility (GHCR): private.
- Public GitHub Releases are not required.

## Versioning
1. Update changelog and verification docs.
2. Ensure required workflows are green on `main`.
3. Tag release: `git tag vX.Y.Z`.
4. Push tag: `git push origin vX.Y.Z`.

## Mandatory checks before tagging
- Backend CI green (`lint`, `test:cov`, `test:e2e`, `build`, docker build/push).
- Platform CI green (`openapi:sync`, `lint`, `test`, `build`, admin smoke e2e).
- Verification docs updated with run links and artifacts.

## Rollout
1. Deploy staging overlay.
2. Validate health/readiness/metrics.
3. Run migration job with lock.
4. Deploy prod overlay.
5. Monitor alerts/Sentry for at least 30 minutes.

## Rollback
- Follow `docs/runbooks/rollback.md`.
