# Platform Environment Variables

## Workspace-level
- `NODE_ENV` (`development|test|production`)
- `NEXT_PUBLIC_APP_ENV` (admin UI environment label)
- `EXPO_PUBLIC_APP_ENV` (mobile environment label)

## Admin Web (`platform/apps/admin-web`)
- `NEXT_PUBLIC_API_BASE_URL` (example `http://localhost:3000/api`)
- `NEXT_PUBLIC_APP_URL` (example `http://localhost:3001`)
- `NEXT_PUBLIC_SENTRY_DSN` (optional)
- `NEXT_PUBLIC_SENTRY_RELEASE` (optional)

## Mobile (`platform/apps/mobile`)
- `EXPO_PUBLIC_API_BASE_URL`
  - Android emulator: `http://10.0.2.2:3000/api`
  - iOS simulator: `http://localhost:3000/api`
  - Physical device: `http://<host-lan-ip>:3000/api`
- `EXPO_PUBLIC_WS_BASE_URL` (optional realtime endpoint)
- `EXPO_PUBLIC_SENTRY_DSN` (optional)
- `EXPO_PUBLIC_SENTRY_RELEASE` (optional)

## API client package behavior
- Access token is stored by token-store adapter:
  - Admin Web: browser storage + HttpOnly refresh cookie flow.
  - Mobile: secure storage adapter.
- Refresh flow requires backend cookie + CSRF headers where enabled.

## Notes
- Keep `.env` files local; commit only `.env.example`.
- If backend API prefix changes, update `*_API_BASE_URL` values accordingly.
