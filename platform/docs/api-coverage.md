# API Usage Coverage

Source: `docs/openapi.json`
Generated: `2026-02-07T23:22:32.993Z`

## Summary

| Metric | Value |
| --- | ---: |
| Total endpoints | 131 |
| USED_IN_UI | 34 |
| WRAPPED_ONLY | 67 |
| BACKEND_ONLY | 7 |
| UNUSED | 23 |
| Overall UI coverage | 25.95% |
| Functional UI coverage (excluding BACKEND_ONLY) | 27.42% |
| Functional wrapper coverage (USED_IN_UI + WRAPPED_ONLY, excluding BACKEND_ONLY) | 81.45% |

## Accounts

Endpoints: 2

| Method | Path | Status | OperationId | Wrapper | UI Calls |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/accounts/me` | UNUSED | AccountsController_me | - | - |
| PATCH | `/api/accounts/profile` | UNUSED | AccountsController_updateProfile | - | - |

## Admin

Endpoints: 6

| Method | Path | Status | OperationId | Wrapper | UI Calls |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/admin/audit` | USED_IN_UI | AdminController_listAudit | `platform/packages/api-client/src/endpoints/admin.ts:25`<br>`platform/packages/api-client/src/endpoints/audit.ts:5` | `platform/apps/admin-web/app/(protected)/audit/page.tsx:25`<br>`platform/apps/admin-web/app/(protected)/dashboard/page.tsx:31` |
| GET | `/api/admin/drivers` | UNUSED | AdminController_listDrivers | - | - |
| POST | `/api/admin/drivers/{userId}/reject` | UNUSED | AdminController_rejectDriver | - | - |
| POST | `/api/admin/drivers/{userId}/verify` | UNUSED | AdminController_verifyDriver | - | - |
| GET | `/api/admin/payments/reconciliation` | UNUSED | AdminController_getPaymentsReconciliation | - | - |
| PATCH | `/api/admin/users/{userId}/role` | UNUSED | AdminController_updateUserRole | - | - |

## AdminPoi

Endpoints: 16

| Method | Path | Status | OperationId | Wrapper | UI Calls |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/admin/poi` | USED_IN_UI | AdminPoiController_list[0] | `platform/packages/api-client/src/endpoints/poi.ts:11` | `platform/apps/admin-web/app/(protected)/poi/page.tsx:47` |
| POST | `/api/admin/poi` | USED_IN_UI | AdminPoiController_create[0] | `platform/packages/api-client/src/endpoints/poi.ts:9` | `platform/apps/admin-web/app/(protected)/poi/page.tsx:56` |
| DELETE | `/api/admin/poi/{id}` | USED_IN_UI | AdminPoiController_remove[0] | `platform/packages/api-client/src/endpoints/poi.ts:14` | `platform/apps/admin-web/app/(protected)/poi/page.tsx:106` |
| PATCH | `/api/admin/poi/{id}` | USED_IN_UI | AdminPoiController_update[0] | `platform/packages/api-client/src/endpoints/poi.ts:13` | `platform/apps/admin-web/app/(protected)/poi/page.tsx:75`<br>`platform/apps/admin-web/app/(protected)/poi/page.tsx:123` |
| POST | `/api/admin/poi/import` | USED_IN_UI | AdminPoiController_import[0] | `platform/packages/api-client/src/endpoints/poi.ts:16` | `platform/apps/admin-web/app/(protected)/poi/page.tsx:96` |
| GET | `/api/admin/poi/reports` | USED_IN_UI | AdminPoiController_listReports[0] | `platform/packages/api-client/src/endpoints/poi.ts:18` | `platform/apps/admin-web/app/(protected)/poi-reports/page.tsx:21` |
| POST | `/api/admin/poi/reports/{id}/approve` | USED_IN_UI | AdminPoiController_approve[0] | `platform/packages/api-client/src/endpoints/poi.ts:20` | `platform/apps/admin-web/app/(protected)/poi-reports/page.tsx:30` |
| POST | `/api/admin/poi/reports/{id}/reject` | USED_IN_UI | AdminPoiController_reject[0] | `platform/packages/api-client/src/endpoints/poi.ts:22` | `platform/apps/admin-web/app/(protected)/poi-reports/page.tsx:31` |
| GET | `/api/v1/admin/poi` | UNUSED | AdminPoiController_list[1] | - | - |
| POST | `/api/v1/admin/poi` | UNUSED | AdminPoiController_create[1] | - | - |
| DELETE | `/api/v1/admin/poi/{id}` | UNUSED | AdminPoiController_remove[1] | - | - |
| PATCH | `/api/v1/admin/poi/{id}` | UNUSED | AdminPoiController_update[1] | - | - |
| POST | `/api/v1/admin/poi/import` | UNUSED | AdminPoiController_import[1] | - | - |
| GET | `/api/v1/admin/poi/reports` | UNUSED | AdminPoiController_listReports[1] | - | - |
| POST | `/api/v1/admin/poi/reports/{id}/approve` | UNUSED | AdminPoiController_approve[1] | - | - |
| POST | `/api/v1/admin/poi/reports/{id}/reject` | UNUSED | AdminPoiController_reject[1] | - | - |

## AdminV1

Endpoints: 11

| Method | Path | Status | OperationId | Wrapper | UI Calls |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/admin/drivers` | USED_IN_UI | AdminV1Controller_listDrivers | `platform/packages/api-client/src/endpoints/admin.ts:13`<br>`platform/packages/api-client/src/endpoints/drivers.ts:9` | `platform/apps/admin-web/app/(protected)/drivers/page.tsx:25`<br>`platform/apps/admin-web/app/(protected)/drivers/[id]/page.tsx:20` |
| POST | `/api/v1/admin/drivers/{userId}/reject` | USED_IN_UI | AdminV1Controller_rejectDriver | `platform/packages/api-client/src/endpoints/admin.ts:17`<br>`platform/packages/api-client/src/endpoints/drivers.ts:13` | `platform/apps/admin-web/app/(protected)/drivers/page.tsx:43` |
| POST | `/api/v1/admin/drivers/{userId}/verify` | USED_IN_UI | AdminV1Controller_verifyDriver | `platform/packages/api-client/src/endpoints/admin.ts:15`<br>`platform/packages/api-client/src/endpoints/drivers.ts:11` | `platform/apps/admin-web/app/(protected)/drivers/page.tsx:42` |
| GET | `/api/v1/admin/payments` | USED_IN_UI | AdminV1Controller_listPayments | `platform/packages/api-client/src/endpoints/admin.ts:19`<br>`platform/packages/api-client/src/endpoints/payments.ts:13` | `platform/apps/admin-web/app/(protected)/payments/page.tsx:22`<br>`platform/apps/admin-web/app/(protected)/payments/[id]/page.tsx:23` |
| GET | `/api/v1/admin/payments/reconciliation` | UNUSED | AdminV1Controller_getPaymentsReconciliation | - | - |
| GET | `/api/v1/admin/tickets` | USED_IN_UI | AdminV1Controller_listSupportTickets | `platform/packages/api-client/src/endpoints/admin.ts:21`<br>`platform/packages/api-client/src/endpoints/tickets.ts:8` | `platform/apps/admin-web/app/(protected)/tickets/page.tsx:22`<br>`platform/apps/admin-web/app/(protected)/tickets/[id]/page.tsx:23` |
| PATCH | `/api/v1/admin/tickets/{ticketId}/status` | USED_IN_UI | AdminV1Controller_updateSupportTicketStatus | `platform/packages/api-client/src/endpoints/admin.ts:23`<br>`platform/packages/api-client/src/endpoints/tickets.ts:10` | `platform/apps/admin-web/app/(protected)/tickets/page.tsx:31`<br>`platform/apps/admin-web/app/(protected)/tickets/[id]/page.tsx:36` |
| GET | `/api/v1/admin/users` | USED_IN_UI | AdminV1Controller_listUsers | `platform/packages/api-client/src/endpoints/admin.ts:5`<br>`platform/packages/api-client/src/endpoints/users.ts:6` | `platform/apps/admin-web/app/(protected)/users/page.tsx:40`<br>`platform/apps/admin-web/app/(protected)/users/[id]/page.tsx:20` |
| POST | `/api/v1/admin/users/{userId}/ban` | USED_IN_UI | AdminV1Controller_banUser | `platform/packages/api-client/src/endpoints/admin.ts:9`<br>`platform/packages/api-client/src/endpoints/users.ts:8` | `platform/apps/admin-web/app/(protected)/users/page.tsx:60` |
| PATCH | `/api/v1/admin/users/{userId}/role` | USED_IN_UI | AdminV1Controller_updateUserRole | `platform/packages/api-client/src/endpoints/admin.ts:7`<br>`platform/packages/api-client/src/endpoints/users.ts:14` | `platform/apps/admin-web/app/(protected)/users/page.tsx:72` |
| POST | `/api/v1/admin/users/{userId}/unban` | USED_IN_UI | AdminV1Controller_unbanUser | `platform/packages/api-client/src/endpoints/admin.ts:11`<br>`platform/packages/api-client/src/endpoints/users.ts:10` | `platform/apps/admin-web/app/(protected)/users/page.tsx:61` |

## Auth

Endpoints: 14

| Method | Path | Status | OperationId | Wrapper | UI Calls |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/auth/login` | WRAPPED_ONLY | AuthController_login | `platform/packages/api-client/src/endpoints/auth.ts:7` | - |
| POST | `/api/auth/logout` | WRAPPED_ONLY | AuthController_logout | `platform/packages/api-client/src/endpoints/auth.ts:15` | - |
| GET | `/api/auth/me` | WRAPPED_ONLY | AuthController_me | `platform/packages/api-client/src/endpoints/auth.ts:13`<br>`platform/packages/api-client/src/endpoints/users.ts:4` | - |
| POST | `/api/auth/otp/send` | WRAPPED_ONLY | AuthController_sendOtp | `platform/packages/api-client/src/endpoints/auth.ts:18` | - |
| POST | `/api/auth/otp/verify` | WRAPPED_ONLY | AuthController_verifyOtp | `platform/packages/api-client/src/endpoints/auth.ts:20` | - |
| POST | `/api/auth/password/reset/confirm` | WRAPPED_ONLY | AuthController_confirmPasswordReset | `platform/packages/api-client/src/endpoints/auth.ts:24` | - |
| POST | `/api/auth/password/reset/request` | WRAPPED_ONLY | AuthController_requestPasswordReset | `platform/packages/api-client/src/endpoints/auth.ts:22` | - |
| POST | `/api/auth/refresh` | WRAPPED_ONLY | AuthController_refresh | `platform/packages/api-client/src/endpoints/auth.ts:11` | - |
| POST | `/api/auth/register` | WRAPPED_ONLY | AuthController_register | `platform/packages/api-client/src/endpoints/auth.ts:5` | - |
| GET | `/api/auth/sessions` | WRAPPED_ONLY | AuthController_sessions | `platform/packages/api-client/src/endpoints/auth.ts:25` | - |
| DELETE | `/api/auth/sessions/{id}` | WRAPPED_ONLY | AuthController_revokeSession | `platform/packages/api-client/src/endpoints/auth.ts:26` | - |
| POST | `/api/auth/web/login` | USED_IN_UI | AuthController_webLogin | `platform/packages/api-client/src/endpoints/auth.ts:9` | `platform/apps/admin-web/app/login/page.tsx:33` |
| POST | `/api/auth/web/logout` | USED_IN_UI | AuthController_webLogout | `platform/packages/api-client/src/endpoints/auth.ts:16` | `platform/apps/admin-web/app/(protected)/layout.tsx:33` |
| POST | `/api/auth/web/refresh` | WRAPPED_ONLY | AuthController_webRefresh | `platform/packages/api-client/src/endpoints/auth.ts:12` | - |

## Bookings

Endpoints: 7

| Method | Path | Status | OperationId | Wrapper | UI Calls |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/bookings/{id}` | USED_IN_UI | BookingsController_getOne | `platform/packages/api-client/src/endpoints/bookings.ts:8` | `platform/apps/admin-web/app/(protected)/bookings/[id]/page.tsx:22` |
| POST | `/api/bookings/{id}/cancel` | USED_IN_UI | BookingsController_cancel | `platform/packages/api-client/src/endpoints/bookings.ts:9` | `platform/apps/admin-web/app/(protected)/bookings/[id]/page.tsx:29` |
| POST | `/api/bookings/{id}/cancel-by-driver` | WRAPPED_ONLY | BookingsController_cancelByDriver | `platform/packages/api-client/src/endpoints/bookings.ts:11` | - |
| POST | `/api/bookings/{id}/complete` | WRAPPED_ONLY | BookingsController_complete | `platform/packages/api-client/src/endpoints/bookings.ts:12` | - |
| GET | `/api/bookings/driver` | USED_IN_UI | BookingsController_myDriver | `platform/packages/api-client/src/endpoints/bookings.ts:7` | `platform/apps/admin-web/app/(protected)/bookings/page.tsx:26`<br>`platform/apps/admin-web/app/(protected)/cancellations/page.tsx:26` |
| GET | `/api/bookings/me` | WRAPPED_ONLY | BookingsController_my | `platform/packages/api-client/src/endpoints/bookings.ts:5` | - |
| GET | `/api/bookings/my` | WRAPPED_ONLY | BookingsController_myAlias | `platform/packages/api-client/src/endpoints/bookings.ts:4` | - |

## Cancellation

Endpoints: 2

| Method | Path | Status | OperationId | Wrapper | UI Calls |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/cancellations/bookings/{bookingId}/apply` | USED_IN_UI | CancellationController_apply | `platform/packages/api-client/src/endpoints/cancellations.ts:7` | `platform/apps/admin-web/app/(protected)/cancellations/page.tsx:33` |
| GET | `/api/cancellations/bookings/{bookingId}/quote` | USED_IN_UI | CancellationController_quote | `platform/packages/api-client/src/endpoints/cancellations.ts:5` | `platform/apps/admin-web/app/(protected)/cancellations/page.tsx:63` |

## Cities

Endpoints: 5

| Method | Path | Status | OperationId | Wrapper | UI Calls |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/admin/cities` | UNUSED | CitiesController_create | - | - |
| DELETE | `/api/admin/cities/{id}` | UNUSED | CitiesController_remove | - | - |
| PATCH | `/api/admin/cities/{id}` | UNUSED | CitiesController_update | - | - |
| GET | `/api/cities` | WRAPPED_ONLY | CitiesController_list | `platform/packages/api-client/src/endpoints/cities.ts:5` | - |
| GET | `/api/cities/{id}` | WRAPPED_ONLY | CitiesController_get | `platform/packages/api-client/src/endpoints/cities.ts:6` | - |

## DriverBookings

Endpoints: 1

| Method | Path | Status | OperationId | Wrapper | UI Calls |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/driver/bookings` | WRAPPED_ONLY | DriverBookingsController_myDriver | `platform/packages/api-client/src/endpoints/bookings.ts:6` | - |

## DriverRequests

Endpoints: 1

| Method | Path | Status | OperationId | Wrapper | UI Calls |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/driver/requests` | USED_IN_UI | DriverRequestsController_list | `platform/packages/api-client/src/endpoints/requests.ts:13` | `platform/apps/admin-web/app/(protected)/live/page.tsx:62` |

## Drivers

Endpoints: 3

| Method | Path | Status | OperationId | Wrapper | UI Calls |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/drivers/me` | WRAPPED_ONLY | DriversController_me | `platform/packages/api-client/src/endpoints/drivers.ts:4` | - |
| POST | `/api/drivers/profile` | WRAPPED_ONLY | DriversController_upsert | `platform/packages/api-client/src/endpoints/drivers.ts:6` | - |
| POST | `/api/drivers/submit` | WRAPPED_ONLY | DriversController_submit | `platform/packages/api-client/src/endpoints/drivers.ts:7` | - |

## Geo

Endpoints: 3

| Method | Path | Status | OperationId | Wrapper | UI Calls |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/geo/trip/{tripId}/eta` | WRAPPED_ONLY | GeoController_getTripEta | `platform/packages/api-client/src/endpoints/geo.ts:11` | - |
| GET | `/api/geo/trips/{tripId}/location` | USED_IN_UI | GeoController_getTripDriverLocation | `platform/packages/api-client/src/endpoints/geo.ts:7` | `platform/apps/admin-web/app/(protected)/live/page.tsx:41` |
| PATCH | `/api/geo/trips/{tripId}/location` | WRAPPED_ONLY | GeoController_updateTripDriverLocation | `platform/packages/api-client/src/endpoints/geo.ts:5` | - |

## Health

Endpoints: 4

| Method | Path | Status | OperationId | Wrapper | UI Calls |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/health` | BACKEND_ONLY | HealthController_health | - | - |
| GET | `/api/ready` | BACKEND_ONLY | HealthController_readyAlias | - | - |
| GET | `/health/live` | BACKEND_ONLY | HealthController_live | - | - |
| GET | `/health/ready` | BACKEND_ONLY | HealthController_ready | - | - |

## Metrics

Endpoints: 1

| Method | Path | Status | OperationId | Wrapper | UI Calls |
| --- | --- | --- | --- | --- | --- |
| GET | `/metrics` | BACKEND_ONLY | MetricsController_metricsEndpoint | - | - |

## Notifications

Endpoints: 3

| Method | Path | Status | OperationId | Wrapper | UI Calls |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/notifications/{id}/read` | USED_IN_UI | NotificationsController_markRead | `platform/packages/api-client/src/endpoints/notifications.ts:7` | `platform/apps/admin-web/app/(protected)/notifications/page.tsx:33` |
| POST | `/api/notifications/devices` | WRAPPED_ONLY | NotificationsController_registerDevice | `platform/packages/api-client/src/endpoints/notifications.ts:9` | - |
| GET | `/api/notifications/my` | USED_IN_UI | NotificationsController_listMine | `platform/packages/api-client/src/endpoints/notifications.ts:5` | `platform/apps/admin-web/app/(protected)/notifications/page.tsx:26` |

## Offers

Endpoints: 5

| Method | Path | Status | OperationId | Wrapper | UI Calls |
| --- | --- | --- | --- | --- | --- |
| PATCH | `/api/offers/{offerId}/accept` | WRAPPED_ONLY | OffersController_accept | `platform/packages/api-client/src/endpoints/offers.ts:9` | - |
| PATCH | `/api/offers/{offerId}/cancel` | WRAPPED_ONLY | OffersController_cancel | `platform/packages/api-client/src/endpoints/offers.ts:13` | - |
| PATCH | `/api/offers/{offerId}/reject` | WRAPPED_ONLY | OffersController_reject | `platform/packages/api-client/src/endpoints/offers.ts:11` | - |
| GET | `/api/offers/requests/{requestId}` | UNUSED | OffersController_list | - | - |
| POST | `/api/offers/requests/{requestId}` | UNUSED | OffersController_create | - | - |

## Payments

Endpoints: 5

| Method | Path | Status | OperationId | Wrapper | UI Calls |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/payments/{paymentId}/mark-paid` | USED_IN_UI | PaymentsController_markPaid | `platform/packages/api-client/src/endpoints/payments.ts:11` | `platform/apps/admin-web/app/(protected)/payments/page.tsx:30`<br>`platform/apps/admin-web/app/(protected)/payments/[id]/page.tsx:36` |
| POST | `/api/payments/booking/{bookingId}/intent` | WRAPPED_ONLY | PaymentsController_createIntent | `platform/packages/api-client/src/endpoints/payments.ts:7` | - |
| GET | `/api/payments/me` | WRAPPED_ONLY | PaymentsController_listMy | `platform/packages/api-client/src/endpoints/payments.ts:8` | - |
| POST | `/api/payments/quote` | WRAPPED_ONLY | PaymentsController_quote | `platform/packages/api-client/src/endpoints/payments.ts:5` | - |
| GET | `/api/payments/quotes/me` | WRAPPED_ONLY | PaymentsController_listMyQuotes | `platform/packages/api-client/src/endpoints/payments.ts:9` | - |

## PaymentsWebhook

Endpoints: 1

| Method | Path | Status | OperationId | Wrapper | UI Calls |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/payments/webhooks/{provider}` | BACKEND_ONLY | PaymentsWebhookController_handle | - | - |

## Poi

Endpoints: 3

| Method | Path | Status | OperationId | Wrapper | UI Calls |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/poi/nearby` | WRAPPED_ONLY | PoiController_nearby | `platform/packages/api-client/src/endpoints/poi.ts:5` | - |
| POST | `/api/poi/reports` | WRAPPED_ONLY | PoiController_report | `platform/packages/api-client/src/endpoints/poi.ts:24` | - |
| POST | `/api/poi/route` | WRAPPED_ONLY | PoiController_route | `platform/packages/api-client/src/endpoints/poi.ts:7` | - |

## Requests

Endpoints: 4

| Method | Path | Status | OperationId | Wrapper | UI Calls |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/trips/{tripId}/requests` | WRAPPED_ONLY | RequestsController_create | `platform/packages/api-client/src/endpoints/trips.ts:23` | - |
| POST | `/api/trips/{tripId}/requests/{requestId}/accept` | WRAPPED_ONLY | RequestsController_accept | `platform/packages/api-client/src/endpoints/trips.ts:27` | - |
| POST | `/api/trips/{tripId}/requests/{requestId}/reject` | WRAPPED_ONLY | RequestsController_reject | `platform/packages/api-client/src/endpoints/trips.ts:29` | - |
| GET | `/api/trips/{tripId}/requests/me` | WRAPPED_ONLY | RequestsController_myRequest | `platform/packages/api-client/src/endpoints/trips.ts:25` | - |

## RequestsById

Endpoints: 5

| Method | Path | Status | OperationId | Wrapper | UI Calls |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/requests/{requestId}/cancel` | WRAPPED_ONLY | RequestsByIdController_cancel | `platform/packages/api-client/src/endpoints/requests.ts:12` | - |
| GET | `/api/requests/{requestId}/negotiation` | WRAPPED_ONLY | RequestsByIdController_getNegotiation | `platform/packages/api-client/src/endpoints/requests.ts:10` | - |
| GET | `/api/requests/{requestId}/offers` | WRAPPED_ONLY | RequestsByIdController_listOffers | `platform/packages/api-client/src/endpoints/offers.ts:5`<br>`platform/packages/api-client/src/endpoints/requests.ts:6` | - |
| POST | `/api/requests/{requestId}/offers` | WRAPPED_ONLY | RequestsByIdController_createOffer | `platform/packages/api-client/src/endpoints/offers.ts:7`<br>`platform/packages/api-client/src/endpoints/requests.ts:8` | - |
| GET | `/api/requests/my` | WRAPPED_ONLY | RequestsByIdController_listMine | `platform/packages/api-client/src/endpoints/requests.ts:4` | - |

## Routing

Endpoints: 6

| Method | Path | Status | OperationId | Wrapper | UI Calls |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/routing/route` | WRAPPED_ONLY | RoutingController_route[0] | `platform/packages/api-client/src/endpoints/routing.ts:5` | - |
| GET | `/api/routing/trip/{tripId}` | WRAPPED_ONLY | RoutingController_tripRoute[0] | `platform/packages/api-client/src/endpoints/routing.ts:9` | - |
| GET | `/api/routing/trip/{tripId}/eta` | USED_IN_UI | RoutingController_tripEta[0] | `platform/packages/api-client/src/endpoints/geo.ts:9`<br>`platform/packages/api-client/src/endpoints/routing.ts:13` | `platform/apps/admin-web/app/(protected)/live/page.tsx:52` |
| GET | `/api/v1/routing/route` | WRAPPED_ONLY | RoutingController_route[1] | `platform/packages/api-client/src/endpoints/routing.ts:7` | - |
| GET | `/api/v1/routing/trip/{tripId}` | WRAPPED_ONLY | RoutingController_tripRoute[1] | `platform/packages/api-client/src/endpoints/routing.ts:11` | - |
| GET | `/api/v1/routing/trip/{tripId}/eta` | WRAPPED_ONLY | RoutingController_tripEta[1] | `platform/packages/api-client/src/endpoints/routing.ts:15` | - |

## SupportTickets

Endpoints: 2

| Method | Path | Status | OperationId | Wrapper | UI Calls |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/support/tickets` | WRAPPED_ONLY | SupportTicketsController_create | `platform/packages/api-client/src/endpoints/tickets.ts:5` | - |
| GET | `/api/support/tickets/my` | WRAPPED_ONLY | SupportTicketsController_listMine | `platform/packages/api-client/src/endpoints/tickets.ts:6` | - |

## Trips

Endpoints: 13

| Method | Path | Status | OperationId | Wrapper | UI Calls |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/trips` | USED_IN_UI | TripsController_search | `platform/packages/api-client/src/endpoints/trips.ts:6` | `platform/apps/admin-web/app/(protected)/live/page.tsx:20`<br>`platform/apps/admin-web/app/(protected)/trips/page.tsx:26` |
| POST | `/api/trips` | WRAPPED_ONLY | TripsController_createTrip | `platform/packages/api-client/src/endpoints/trips.ts:9` | - |
| GET | `/api/trips/{id}` | USED_IN_UI | TripsController_getById | `platform/packages/api-client/src/endpoints/trips.ts:7` | `platform/apps/admin-web/app/(protected)/trips/[id]/page.tsx:19` |
| PATCH | `/api/trips/{id}` | WRAPPED_ONLY | TripsController_updateTrip | `platform/packages/api-client/src/endpoints/trips.ts:11` | - |
| PATCH | `/api/trips/{id}/cancel` | WRAPPED_ONLY | TripsController_cancel | `platform/packages/api-client/src/endpoints/trips.ts:20` | - |
| POST | `/api/trips/{id}/cancel` | WRAPPED_ONLY | TripsController_cancelPost | `platform/packages/api-client/src/endpoints/trips.ts:21` | - |
| PATCH | `/api/trips/{id}/complete` | WRAPPED_ONLY | TripsController_complete | `platform/packages/api-client/src/endpoints/trips.ts:18` | - |
| POST | `/api/trips/{id}/complete` | WRAPPED_ONLY | TripsController_completePost | `platform/packages/api-client/src/endpoints/trips.ts:19` | - |
| PATCH | `/api/trips/{id}/publish` | WRAPPED_ONLY | TripsController_publish | `platform/packages/api-client/src/endpoints/trips.ts:13` | - |
| POST | `/api/trips/{id}/publish` | WRAPPED_ONLY | TripsController_publishPost | `platform/packages/api-client/src/endpoints/trips.ts:15` | - |
| PATCH | `/api/trips/{id}/start` | WRAPPED_ONLY | TripsController_start | `platform/packages/api-client/src/endpoints/trips.ts:16` | - |
| POST | `/api/trips/{id}/start` | WRAPPED_ONLY | TripsController_startPost | `platform/packages/api-client/src/endpoints/trips.ts:17` | - |
| GET | `/api/trips/search` | WRAPPED_ONLY | TripsController_searchAlias | `platform/packages/api-client/src/endpoints/trips.ts:5` | - |

## Users

Endpoints: 2

| Method | Path | Status | OperationId | Wrapper | UI Calls |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/users/count` | UNUSED | UsersController_count | - | - |
| GET | `/api/users/health` | BACKEND_ONLY | UsersController_health | - | - |

## Vehicles

Endpoints: 6

| Method | Path | Status | OperationId | Wrapper | UI Calls |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/admin/vehicles` | UNUSED | VehiclesController_listAll | - | - |
| GET | `/api/vehicles` | WRAPPED_ONLY | VehiclesController_listMine | `platform/packages/api-client/src/endpoints/vehicles.ts:7` | - |
| POST | `/api/vehicles` | WRAPPED_ONLY | VehiclesController_createMine | `platform/packages/api-client/src/endpoints/vehicles.ts:9` | - |
| DELETE | `/api/vehicles/{id}` | WRAPPED_ONLY | VehiclesController_removeMine | `platform/packages/api-client/src/endpoints/vehicles.ts:12` | - |
| PATCH | `/api/vehicles/{id}` | WRAPPED_ONLY | VehiclesController_updateMine | `platform/packages/api-client/src/endpoints/vehicles.ts:11` | - |
| GET | `/api/vehicles/my` | WRAPPED_ONLY | VehiclesController_listMineAlias | `platform/packages/api-client/src/endpoints/vehicles.ts:5` | - |

