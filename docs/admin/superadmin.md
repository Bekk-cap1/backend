# Superadmin Mode

## Role Model
- `SUPERADMIN` is a backend role (`Role.superadmin`) with RBAC bypass in `RolesGuard`.
- Any endpoint guarded with `@Roles(...)` is accessible to superadmin.

## Dangerous Operations Protection
- For destructive/high-risk admin actions, backend requires:
- `reason` in body (minimum 10 chars).
- `X-Admin-Confirm` header with one-time token from `POST /api/v1/admin/reauth`.

## Re-auth Flow
1. Call `POST /api/v1/admin/reauth` with current password.
2. Receive `{ confirmToken, expiresAt }` (TTL 5 minutes, Redis-backed).
3. Send token in `X-Admin-Confirm` for dangerous endpoint.

## Impersonation
- Start: `POST /api/v1/admin/impersonate` with `{ userId, reason }` + confirm token.
- Stop: `POST /api/v1/admin/impersonate/stop` with `{ reason }`.
- Restrictions:
- Only `SUPERADMIN`.
- Target cannot be another superadmin.
- Impersonation tokens are short-lived (30 minutes).

## Audit Coverage
- Every superadmin operation is logged with actor, action, target, reason.
- Impersonated requests are marked via `_context.impersonated=true` in audit metadata.

## Bootstrap First Superadmin
- Optional envs at startup:
- `BOOTSTRAP_SUPERADMIN_PHONE`
- `BOOTSTRAP_SUPERADMIN_PASSWORD`
- On startup, backend ensures this account exists with `superadmin` role.
- Remove these envs in production after bootstrap.
