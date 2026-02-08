# API Map

Generated from `platform/.cache/openapi.json`.

| Area | Page | Method | Path | OperationId |
| --- | --- | --- | --- | --- |
| Admin | /audit | GET | `/api/admin/audit` | AdminController_listAudit |
| Admin | n/a | POST | `/api/admin/cities` | CitiesController_create |
| Admin | n/a | DELETE | `/api/admin/cities/{id}` | CitiesController_remove |
| Admin | n/a | PATCH | `/api/admin/cities/{id}` | CitiesController_update |
| Admin | n/a | GET | `/api/admin/drivers` | AdminController_listDrivers |
| Admin | n/a | POST | `/api/admin/drivers/{userId}/reject` | AdminController_rejectDriver |
| Admin | n/a | POST | `/api/admin/drivers/{userId}/verify` | AdminController_verifyDriver |
| Admin | n/a | GET | `/api/admin/payments/reconciliation` | AdminController_getPaymentsReconciliation |
| Admin | /poi and /poi-reports | GET | `/api/admin/poi` | AdminPoiController_list[0] |
| Admin | /poi and /poi-reports | POST | `/api/admin/poi` | AdminPoiController_create[0] |
| Admin | /poi and /poi-reports | DELETE | `/api/admin/poi/{id}` | AdminPoiController_remove[0] |
| Admin | /poi and /poi-reports | PATCH | `/api/admin/poi/{id}` | AdminPoiController_update[0] |
| Admin | /poi and /poi-reports | POST | `/api/admin/poi/import` | AdminPoiController_import[0] |
| Admin | /poi and /poi-reports | GET | `/api/admin/poi/reports` | AdminPoiController_listReports[0] |
| Admin | /poi and /poi-reports | POST | `/api/admin/poi/reports/{id}/approve` | AdminPoiController_approve[0] |
| Admin | /poi and /poi-reports | POST | `/api/admin/poi/reports/{id}/reject` | AdminPoiController_reject[0] |
| Admin | n/a | PATCH | `/api/admin/users/{userId}/role` | AdminController_updateUserRole |
| Admin | n/a | GET | `/api/admin/vehicles` | VehiclesController_listAll |
| Admin | /drivers | GET | `/api/v1/admin/drivers` | AdminV1Controller_listDrivers |
| Admin | /drivers | POST | `/api/v1/admin/drivers/{userId}/reject` | AdminV1Controller_rejectDriver |
| Admin | /drivers | POST | `/api/v1/admin/drivers/{userId}/verify` | AdminV1Controller_verifyDriver |
| Admin | /payments | GET | `/api/v1/admin/payments` | AdminV1Controller_listPayments |
| Admin | /payments | GET | `/api/v1/admin/payments/reconciliation` | AdminV1Controller_getPaymentsReconciliation |
| Admin | n/a | GET | `/api/v1/admin/poi` | AdminPoiController_list[1] |
| Admin | n/a | POST | `/api/v1/admin/poi` | AdminPoiController_create[1] |
| Admin | n/a | DELETE | `/api/v1/admin/poi/{id}` | AdminPoiController_remove[1] |
| Admin | n/a | PATCH | `/api/v1/admin/poi/{id}` | AdminPoiController_update[1] |
| Admin | n/a | POST | `/api/v1/admin/poi/import` | AdminPoiController_import[1] |
| Admin | n/a | GET | `/api/v1/admin/poi/reports` | AdminPoiController_listReports[1] |
| Admin | n/a | POST | `/api/v1/admin/poi/reports/{id}/approve` | AdminPoiController_approve[1] |
| Admin | n/a | POST | `/api/v1/admin/poi/reports/{id}/reject` | AdminPoiController_reject[1] |
| Admin | /tickets | GET | `/api/v1/admin/tickets` | AdminV1Controller_listSupportTickets |
| Admin | /tickets | PATCH | `/api/v1/admin/tickets/{ticketId}/status` | AdminV1Controller_updateSupportTicketStatus |
| Admin | /users | GET | `/api/v1/admin/users` | AdminV1Controller_listUsers |
| Admin | /users | POST | `/api/v1/admin/users/{userId}/ban` | AdminV1Controller_banUser |
| Admin | /users | PATCH | `/api/v1/admin/users/{userId}/role` | AdminV1Controller_updateUserRole |
| Admin | /users | POST | `/api/v1/admin/users/{userId}/unban` | AdminV1Controller_unbanUser |
| Auth | /login | POST | `/api/auth/login` | AuthController_login |
| Auth | /login | POST | `/api/auth/logout` | AuthController_logout |
| Auth | /login | GET | `/api/auth/me` | AuthController_me |
| Auth | /login | POST | `/api/auth/otp/send` | AuthController_sendOtp |
| Auth | /login | POST | `/api/auth/otp/verify` | AuthController_verifyOtp |
| Auth | /login | POST | `/api/auth/password/reset/confirm` | AuthController_confirmPasswordReset |
| Auth | /login | POST | `/api/auth/password/reset/request` | AuthController_requestPasswordReset |
| Auth | /login | POST | `/api/auth/refresh` | AuthController_refresh |
| Auth | /login | POST | `/api/auth/register` | AuthController_register |
| Auth | /login | GET | `/api/auth/sessions` | AuthController_sessions |
| Auth | /login | DELETE | `/api/auth/sessions/{id}` | AuthController_revokeSession |
| Auth | /login | POST | `/api/auth/web/login` | AuthController_webLogin |
| Auth | /login | POST | `/api/auth/web/logout` | AuthController_webLogout |
| Auth | /login | POST | `/api/auth/web/refresh` | AuthController_webRefresh |
| Bookings | /bookings | GET | `/api/bookings/{id}` | BookingsController_getOne |
| Bookings | /bookings | POST | `/api/bookings/{id}/cancel` | BookingsController_cancel |
| Bookings | /bookings | POST | `/api/bookings/{id}/cancel-by-driver` | BookingsController_cancelByDriver |
| Bookings | /bookings | POST | `/api/bookings/{id}/complete` | BookingsController_complete |
| Bookings | /bookings | GET | `/api/bookings/driver` | BookingsController_myDriver |
| Bookings | /bookings | GET | `/api/bookings/me` | BookingsController_my |
| Bookings | /bookings | GET | `/api/bookings/my` | BookingsController_myAlias |
| Bookings | /bookings | GET | `/api/driver/bookings` | DriverBookingsController_myDriver |
| Cancellations | /cancellations | POST | `/api/cancellations/bookings/{bookingId}/apply` | CancellationController_apply |
| Cancellations | /cancellations | GET | `/api/cancellations/bookings/{bookingId}/quote` | CancellationController_quote |
| Geo | /live | GET | `/api/geo/trip/{tripId}/eta` | GeoController_getTripEta |
| Geo | /live | GET | `/api/geo/trips/{tripId}/location` | GeoController_getTripDriverLocation |
| Geo | /live | PATCH | `/api/geo/trips/{tripId}/location` | GeoController_updateTripDriverLocation |
| Notifications | /notifications | POST | `/api/notifications/{id}/read` | NotificationsController_markRead |
| Notifications | /notifications | POST | `/api/notifications/devices` | NotificationsController_registerDevice |
| Notifications | /notifications | GET | `/api/notifications/my` | NotificationsController_listMine |
| Observability | /dashboard | GET | `/api/health` | HealthController_health |
| Observability | /dashboard | GET | `/api/ready` | HealthController_readyAlias |
| Observability | /dashboard | GET | `/health/live` | HealthController_live |
| Observability | /dashboard | GET | `/health/ready` | HealthController_ready |
| Observability | /dashboard | GET | `/metrics` | MetricsController_metricsEndpoint |
| Other | n/a | GET | `/api/accounts/me` | AccountsController_me |
| Other | n/a | PATCH | `/api/accounts/profile` | AccountsController_updateProfile |
| Other | n/a | GET | `/api/cities` | CitiesController_list |
| Other | n/a | GET | `/api/cities/{id}` | CitiesController_get |
| Other | n/a | GET | `/api/driver/requests` | DriverRequestsController_list |
| Other | n/a | GET | `/api/drivers/me` | DriversController_me |
| Other | n/a | POST | `/api/drivers/profile` | DriversController_upsert |
| Other | n/a | POST | `/api/drivers/submit` | DriversController_submit |
| Other | n/a | GET | `/api/users/count` | UsersController_count |
| Other | n/a | GET | `/api/users/health` | UsersController_health |
| Other | n/a | GET | `/api/v1/routing/route` | RoutingController_route[1] |
| Other | n/a | GET | `/api/v1/routing/trip/{tripId}` | RoutingController_tripRoute[1] |
| Other | n/a | GET | `/api/v1/routing/trip/{tripId}/eta` | RoutingController_tripEta[1] |
| Other | n/a | GET | `/api/vehicles` | VehiclesController_listMine |
| Other | n/a | POST | `/api/vehicles` | VehiclesController_createMine |
| Other | n/a | DELETE | `/api/vehicles/{id}` | VehiclesController_removeMine |
| Other | n/a | PATCH | `/api/vehicles/{id}` | VehiclesController_updateMine |
| Other | n/a | GET | `/api/vehicles/my` | VehiclesController_listMineAlias |
| Payments | /payments | POST | `/api/payments/{paymentId}/mark-paid` | PaymentsController_markPaid |
| Payments | /payments | POST | `/api/payments/booking/{bookingId}/intent` | PaymentsController_createIntent |
| Payments | /payments | GET | `/api/payments/me` | PaymentsController_listMy |
| Payments | /payments | POST | `/api/payments/quote` | PaymentsController_quote |
| Payments | /payments | GET | `/api/payments/quotes/me` | PaymentsController_listMyQuotes |
| Payments | /payments | POST | `/api/payments/webhooks/{provider}` | PaymentsWebhookController_handle |
| POI | /poi and /poi-reports | GET | `/api/poi/nearby` | PoiController_nearby |
| POI | /poi and /poi-reports | POST | `/api/poi/reports` | PoiController_report |
| POI | /poi and /poi-reports | POST | `/api/poi/route` | PoiController_route |
| Routing | /live | GET | `/api/routing/route` | RoutingController_route[0] |
| Routing | /live | GET | `/api/routing/trip/{tripId}` | RoutingController_tripRoute[0] |
| Routing | /live | GET | `/api/routing/trip/{tripId}/eta` | RoutingController_tripEta[0] |
| Support Tickets | /tickets | POST | `/api/support/tickets` | SupportTicketsController_create |
| Support Tickets | /tickets | GET | `/api/support/tickets/my` | SupportTicketsController_listMine |
| Trips | /trips | PATCH | `/api/offers/{offerId}/accept` | OffersController_accept |
| Trips | /trips | PATCH | `/api/offers/{offerId}/cancel` | OffersController_cancel |
| Trips | /trips | PATCH | `/api/offers/{offerId}/reject` | OffersController_reject |
| Trips | /trips | GET | `/api/offers/requests/{requestId}` | OffersController_list |
| Trips | /trips | POST | `/api/offers/requests/{requestId}` | OffersController_create |
| Trips | /trips | POST | `/api/requests/{requestId}/cancel` | RequestsByIdController_cancel |
| Trips | /trips | GET | `/api/requests/{requestId}/negotiation` | RequestsByIdController_getNegotiation |
| Trips | /trips | GET | `/api/requests/{requestId}/offers` | RequestsByIdController_listOffers |
| Trips | /trips | POST | `/api/requests/{requestId}/offers` | RequestsByIdController_createOffer |
| Trips | /trips | GET | `/api/requests/my` | RequestsByIdController_listMine |
| Trips | /trips | GET | `/api/trips` | TripsController_search |
| Trips | /trips | POST | `/api/trips` | TripsController_createTrip |
| Trips | /trips | GET | `/api/trips/{id}` | TripsController_getById |
| Trips | /trips | PATCH | `/api/trips/{id}` | TripsController_updateTrip |
| Trips | /trips | PATCH | `/api/trips/{id}/cancel` | TripsController_cancel |
| Trips | /trips | POST | `/api/trips/{id}/cancel` | TripsController_cancelPost |
| Trips | /trips | PATCH | `/api/trips/{id}/complete` | TripsController_complete |
| Trips | /trips | POST | `/api/trips/{id}/complete` | TripsController_completePost |
| Trips | /trips | PATCH | `/api/trips/{id}/publish` | TripsController_publish |
| Trips | /trips | POST | `/api/trips/{id}/publish` | TripsController_publishPost |
| Trips | /trips | PATCH | `/api/trips/{id}/start` | TripsController_start |
| Trips | /trips | POST | `/api/trips/{id}/start` | TripsController_startPost |
| Trips | /trips | POST | `/api/trips/{tripId}/requests` | RequestsController_create |
| Trips | /trips | POST | `/api/trips/{tripId}/requests/{requestId}/accept` | RequestsController_accept |
| Trips | /trips | POST | `/api/trips/{tripId}/requests/{requestId}/reject` | RequestsController_reject |
| Trips | /trips | GET | `/api/trips/{tripId}/requests/me` | RequestsController_myRequest |
| Trips | /trips | GET | `/api/trips/search` | TripsController_searchAlias |
