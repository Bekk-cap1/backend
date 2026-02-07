# Product Operations Notes

## Worker process
Outbox consumer can run in a dedicated process:

```bash
npm run start:worker
```

This process runs BullMQ consumers and outbox scheduling without exposing HTTP.

## Routing providers
- CI/test: deterministic mock provider (no external dependency).
- Production-like local run:
  1. `docker compose -f docker-compose.osrm.yml up -d`
  2. set `ROUTING_PROVIDER=osrm`
  3. set `OSRM_BASE_URL=http://localhost:5000`

## Radar alerts dedup
- Redis key: `radar_alert:{tripId}:{poiId}`
- TTL: `600s`

## Cancellation policy
- Fee percent: `BOOKING_CANCEL_FEE_PERCENT`
- API:
  - `GET /api/cancellations/bookings/:bookingId/quote`
  - `POST /api/cancellations/bookings/:bookingId/apply`
