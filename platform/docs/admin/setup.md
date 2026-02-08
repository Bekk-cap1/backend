# Admin Setup

## Prerequisites

- Node 22+
- pnpm 10+
- Backend running at `http://localhost:3000`

## Install and Run

```bash
cd platform
pnpm i
pnpm openapi:sync
pnpm dev:admin
```

App URL: `http://localhost:3001`

## Required env

`apps/admin-web/.env.local`

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

## Login

- Use admin or moderator account.
- Role is checked by middleware using auth cookies.
