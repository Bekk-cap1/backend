# Product API Map

This map captures production endpoints after stabilization/completion.
Prefix is `/${API_PREFIX}` (default `api`), so `GET /routing/route` becomes
`GET /api/routing/route` by default.

## Auth / Account hardening
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/otp/send`
- `POST /auth/otp/verify`
- `POST /auth/password/reset/request`
- `POST /auth/password/reset/confirm`
- `GET /auth/sessions`
- `DELETE /auth/sessions/:id`

## Trips / Requests / Offers / Bookings
- `GET /trips/search`
- `POST /trips`
- `PATCH /trips/:id/publish`
- `PATCH /trips/:id/start`
- `PATCH /trips/:id/complete`
- `POST /trips/:id/requests`
- `POST /requests/:id/offers`
- `PATCH /offers/:id/accept`
- `GET /bookings/me`
- `GET /driver/bookings`
- `POST /bookings/:id/cancel`

## Geo (realtime location + track)
- `PATCH /geo/trips/:tripId/location`
- `GET /geo/trips/:tripId/location`
- `GET /geo/trip/:tripId/eta`
- WS namespace `/ws`:
  - inbound: `driver.location.update`
  - outbound: `trip.driver.location`

## Routing
- `GET /routing/route`
- `GET /routing/trip/:tripId`
- `GET /routing/trip/:tripId/eta`

Provider policy:
- `NODE_ENV=test` or `ROUTING_PROVIDER=mock` -> deterministic mock provider
- otherwise OSRM provider (`OSRM_BASE_URL`)

## POI / Radars
- `GET /poi/nearby`
- `POST /poi/route`
- `POST /poi/reports` (community report)

Admin moderation / ops:
- `POST /admin/poi`
- `GET /admin/poi`
- `PATCH /admin/poi/:id`
- `DELETE /admin/poi/:id`
- `POST /admin/poi/import`
- `GET /admin/poi/reports`
- `POST /admin/poi/reports/:id/approve`
- `POST /admin/poi/reports/:id/reject`

Radar alerts:
- WS outbound: `trip.radar.alert`
- Redis dedup key: `radar_alert:{tripId}:{poiId}` (`TTL=600s`)

## Pricing / Payments
- `POST /payments/quote`
- `GET /payments/quotes/me`
- `POST /payments/booking/:bookingId/intent`
- `GET /payments/me`
- `POST /payments/:paymentId/mark-paid` (admin/moderator)
- `POST /payments/webhooks/:provider`

## Cancellation policy
- `GET /cancellations/bookings/:bookingId/quote`
- `POST /cancellations/bookings/:bookingId/apply`

## Support tickets
- `POST /support/tickets`
- `GET /support/tickets/my`

## Admin (legacy + v1)
Legacy:
- `GET /admin/drivers`
- `POST /admin/drivers/:userId/verify`
- `POST /admin/drivers/:userId/reject`
- `PATCH /admin/users/:userId/role`
- `GET /admin/audit`

Versioned:
- `GET /v1/admin/drivers`
- `POST /v1/admin/drivers/:userId/verify`
- `POST /v1/admin/drivers/:userId/reject`
- `GET /v1/admin/users`
- `PATCH /v1/admin/users/:userId/role`
- `POST /v1/admin/users/:userId/ban`
- `POST /v1/admin/users/:userId/unban`
- `GET /v1/admin/payments`
- `GET /v1/admin/tickets`
- `PATCH /v1/admin/tickets/:ticketId/status`

## Ops / health / metrics
- `GET /health/live`
- `GET /health/ready`
- `GET /metrics`
