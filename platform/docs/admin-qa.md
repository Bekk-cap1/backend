# Admin QA Checklist

## Auth and RBAC

- [ ] `/login` accepts admin credentials and redirects to `/dashboard`
- [ ] non-admin account is blocked and redirected to login
- [ ] protected routes are inaccessible without auth cookie

## Dashboard

- [ ] 4 KPI cards rendered
- [ ] recent audit table loads
- [ ] system health card visible

## Users

- [ ] table columns match spec
- [ ] search/role/status filters work
- [ ] ban/unban action requires confirm and refreshes table

## Drivers

- [ ] pending list loads
- [ ] verify/reject actions update list

## POI

- [ ] CRUD list loads
- [ ] import action available
- [ ] coordinates copy works

## POI Reports

- [ ] report list loads
- [ ] approve/reject updates status

## Tickets / Payments / Audit

- [ ] tickets list and status update work
- [ ] payments list and mark-paid action work
- [ ] audit list loads and metadata modal opens

## Settings

- [ ] theme toggle works (light/dark)
- [ ] operational links accessible
