# Privacy Policy (Intercity)

## Data we collect
- Account data: phone/email, hashed password, role.
- Trip data: trips, requests, offers, bookings, support tickets.
- Location data: driver live location samples during active trip windows.
- Device data: push token metadata (platform/model) for notifications.
- Payment metadata: provider references, statuses, idempotency keys.

## Why we collect it
- Operate ride booking and negotiation flows.
- Safety and live ETA/location features.
- Fraud prevention, auditability, and support operations.
- Payment processing and reconciliation.

## Retention and deletion
- Geo samples are retained according to `GEO_LOCATION_RETENTION_DAYS` and cleaned by cron.
- Audit/payment records are retained for operational/legal compliance.
- Deletion requests are processed through support workflow and legal checks.

## Security
- Access/refresh auth controls, RBAC, rate limiting, CSRF for cookie flows.
- Secrets are not stored in source control.

## Contact
- Support: support@intercity.local
- Data requests: privacy@intercity.local
