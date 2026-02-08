# Mobile QA Checklist

## Auth and role routing

- [ ] Passenger login routes to passenger tabs.
- [ ] Driver login routes to driver tabs.
- [ ] Admin/moderator/ops login routes to blocked screen.
- [ ] Logout clears tokens and returns to auth screens.

## Passenger critical path

- [ ] Home search calls trips search and opens result list.
- [ ] Trip details loads native map route polyline + driver marker + layer toggles.
- [ ] Trip details shows ETA and refreshes location/eta polling.
- [ ] Create request opens negotiation screen.
- [ ] Negotiation supports send offer / accept / cancel and updates every ~3s.
- [ ] Turn-based negotiation blocks action if not your turn and shows friendly toast.
- [ ] Booking details shows status, ETA and cancellation quote/apply.
- [ ] Payments can create intent and return from payment URL/deeplink.

## Driver critical path

- [ ] Driver profile loads and can submit verification.
- [ ] Vehicles CRUD works for current driver.
- [ ] Trip create + publish works.
- [ ] Requests inbox opens negotiation flow.
- [ ] Active trip can start/complete and sends foreground location updates.
- [ ] Active trip can enable background updates and shows sharing/offline/last-update indicators.
- [ ] Radar alert banner appears when near POI/radar and respects cooldown.

## Offline and retry reliability

- [ ] Offline banner appears when device loses internet.
- [ ] Critical actions are queued when offline: request, offer, payment-intent, location.
- [ ] Queue flushes automatically after reconnect.
- [ ] No duplicate location spam (throttle + distance dedupe).

## Push and deep links

- [ ] Device token registers through `POST /api/notifications/devices`.
- [ ] Notification tap opens app via deep link.
- [ ] Notification list loads and mark-read works.

## UX states

- [ ] Loading skeletons are shown for data screens.
- [ ] Empty state appears with actionable copy.
- [ ] Error state appears with retry action.
- [ ] Destructive actions use confirm dialog.

## Unit tests

- [ ] `src/tests/auth.store.test.ts`
- [ ] `src/tests/token-store.test.ts`
- [ ] `src/tests/negotiation.reducer.test.ts`
- [ ] `src/tests/location.queue.test.ts`
- [ ] `src/tests/payment.flow.test.ts`
