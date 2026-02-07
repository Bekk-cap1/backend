# API Overview

Swagger is available when `SWAGGER_ENABLED=true`:
- `http://localhost:3000/api/swagger`

## Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/otp/send`
- `POST /api/auth/otp/verify`
- `POST /api/auth/password/reset/request`
- `POST /api/auth/password/reset/confirm`
- `GET /api/auth/sessions`
- `DELETE /api/auth/sessions/:id`

## Cities
- `GET /api/cities`
- `POST /api/cities` (admin, optional)

## Vehicles (driver)
- `POST /api/vehicles`
- `GET /api/vehicles/my`
- `PATCH /api/vehicles/:id`
- `DELETE /api/vehicles/:id`

## Trips
- `GET /api/trips/search`
- `GET /api/trips/:id`
- `POST /api/trips` (draft)
- `PATCH /api/trips/:id` (draft)
- `POST /api/trips/:id/publish`
- `POST /api/trips/:id/start`
- `POST /api/trips/:id/complete`
- `POST /api/trips/:id/cancel`

## Requests & Negotiation
- `POST /api/trips/:id/requests`
- `GET /api/requests/my`
- `GET /api/driver/requests`
- `POST /api/requests/:id/cancel`
- `POST /api/requests/:id/reject`
- `POST /api/requests/:id/accept`
- `GET /api/requests/:id/offers`
- `POST /api/requests/:id/offers`
- `GET /api/requests/:id/negotiation`

## Bookings
- `GET /api/bookings/my`
- `GET /api/bookings/driver` (alias: `/api/driver/bookings`)
- `POST /api/bookings/:id/cancel`
- `POST /api/bookings/:id/complete`

## Payments
- `POST /api/payments/quote`
- `POST /api/payments/booking/:bookingId/intent`
- `GET /api/payments/me`

## Notifications & Realtime
- `GET /api/notifications/my`
- `POST /api/notifications/:id/read`
- WS: `/ws` (socket.io namespace)

## Routing & Geo
- `GET /api/routing/route`
- `PATCH /api/geo/trips/:tripId/location`
- `GET /api/geo/trips/:tripId/location`
- `GET /api/geo/trip/:tripId/eta`

## POI / Radar
- `GET /api/poi/nearby`
- `POST /api/poi/route`
- `POST /api/admin/poi`
- `GET /api/admin/poi`
- `PATCH /api/admin/poi/:id`
- `DELETE /api/admin/poi/:id`

## Support Tickets
- `POST /api/support/tickets`
- `GET /api/support/tickets/my`

## Admin
- `GET /api/admin/drivers?status=...`
- `POST /api/admin/drivers/:id/verify`
- `POST /api/admin/drivers/:id/reject`
- `GET /api/admin/audit`
