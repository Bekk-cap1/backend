# Admin Architecture

## Stack

- Next.js App Router
- Tailwind + shadcn-style component primitives
- TanStack Query for server state
- TanStack Table for tabular operations
- Zod + react-hook-form for auth validation

## Key Modules

- `app/(protected)` route group for RBAC-protected pages
- `middleware.ts` for admin-only gate
- `components/shared` reusable UI (`PageHeader`, `KpiCard`, `DataTable`, `StatusPill`, `ConfirmDialog`, `Toast`)
- `lib/api.ts` bootstraps `@platform/api-client`

## Data and UX

- Debounced search on heavy list pages.
- Confirm dialogs for destructive actions.
- Optimistic update on POI delete.
- Unified skeleton/empty/error states via DataTable and state components.
