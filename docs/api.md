# API Overview

Swagger is available when `SWAGGER_ENABLED=true`:
- `http://localhost:3000/api/swagger`

## Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

## Cities
- `GET /cities`
- `POST /cities` (admin, optional)

## Vehicles (driver)
- `POST /vehicles`
- `GET /vehicles/my`
- `PATCH /vehicles/:id`
- `DELETE /vehicles/:id`

## Trips
- `GET /trips/search`
- `GET /trips/:id`
- `POST /trips` (draft)
- `PATCH /trips/:id` (draft)
- `POST /trips/:id/publish`
- `POST /trips/:id/start`
- `POST /trips/:id/complete`
- `POST /trips/:id/cancel`

## Requests & Negotiation
- `POST /trips/:id/requests`
- `GET /requests/my`
- `GET /driver/requests`
- `POST /requests/:id/cancel`
- `POST /requests/:id/reject`
- `POST /requests/:id/accept`
- `GET /requests/:id/offers`
- `POST /requests/:id/offers`
- `GET /requests/:id/negotiation`

## Bookings
- `GET /bookings/my`
- `GET /bookings/driver` (alias: `/driver/bookings`)
- `POST /bookings/:id/cancel`
- `POST /bookings/:id/complete`

## Payments (optional)
- `POST /payments/intent`
- `POST /payments/webhook`
- `GET /payments/:id`

## Notifications & Realtime
- `GET /notifications/my`
- `POST /notifications/:id/read`
- WS: `/ws` (token auth)

## Admin
- `GET /admin/drivers?status=...`
- `POST /admin/drivers/:id/verify`
- `POST /admin/drivers/:id/reject`
- `GET /admin/audit`
