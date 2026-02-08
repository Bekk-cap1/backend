# Intercity Platform Monorepo

Scalable frontend monorepo colocated in `platform/` with admin web and mobile apps.

## Runtime Requirements

- Node `22.x` (see `.nvmrc`)
- pnpm `10.x`

Quick setup:

```bash
cd platform
nvm use
pnpm i
```

## Folder Structure

```text
platform/
  apps/
    admin-web/
    mobile/
  packages/
    shared/
    api-client/
    ui/
    config/
  scripts/
    fetch-openapi.mjs
    generate-openapi-types.mjs
    sync-api-map.mjs
  docs/
    API_CONTRACT.md
    api-map.md
    api-gaps.md
    admin/
      setup.md
      architecture.md
      qa.md
    mobile/
      setup.md
      architecture.md
      qa.md
  package.json
  pnpm-workspace.yaml
  turbo.json
```

## Commands

```bash
pnpm i
pnpm openapi:sync
pnpm dev:admin
pnpm dev:mobile
pnpm test
```

Additional commands:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
```

## Workspaces

- `apps/admin-web`: Next.js App Router admin console with shadcn-style UI primitives.
- `apps/mobile`: Expo React Native app for passenger + driver.
- `packages/shared`: OpenAPI types, role constants, zod schemas, permissions.
- `packages/api-client`: Axios client, refresh queue, tokenStore adapters, endpoint wrappers.

## OpenAPI Sync

`pnpm openapi:sync` executes:

1. `scripts/fetch-openapi.mjs` -> copies `../docs/openapi.json` to `platform/.cache/openapi.json`
2. `scripts/generate-openapi-types.mjs` -> generates `packages/shared/src/types/openapi.d.ts`
3. `scripts/sync-api-map.mjs` -> generates `docs/API_CONTRACT.md`
4. `scripts/generate-api-gaps.mjs` -> generates `docs/api-gaps.md` and `packages/shared/src/constants/api-gaps.generated.ts`

## Local Dev Topology

- Backend API: `http://localhost:3000`
- Admin web: `http://localhost:3001`
- Expo mobile: `apps/mobile`

Env files:

- root: `platform/.env.example`
- admin: `platform/apps/admin-web/.env.example`
- mobile: `platform/apps/mobile/.env.example`

Set `EXPO_PUBLIC_API_BASE_URL` for your target:

- Android emulator: `http://10.0.2.2:3000`
- iOS simulator: `http://127.0.0.1:3000`
- Physical device: `http://<YOUR_LAN_IP>:3000`

## Notes

- API endpoint wrappers in `packages/api-client` follow existing backend paths from `docs/openapi.json`.
- Admin-only UX in web app; mobile app blocks admin and prompts using web console.
- Real-time geo and ETA are integrated with polling in mobile screens.
