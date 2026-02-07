# Geo, Routing, Radar

## Realtime driver location
- WS namespace: `/ws`
- Driver emits `driver.location.update` with payload:
  - `tripId`, `lat`, `lon`, optional `speedKmh`, `headingDeg`
- Server broadcasts `trip.driver.location` to trip participants/admin.

Data path:
- last known location stored in Redis key `geo:last:trip:{tripId}`
- full samples persisted into PostGIS table `DriverLocationSample`

REST fallback:
- `PATCH /api/geo/trips/:tripId/location`
- `GET /api/geo/trips/:tripId/location`

Access control:
- only trip driver can update
- only trip participants and admin/moderator can read

## Routing + ETA
- Endpoint: `GET /api/routing/route`
- Provider selection:
  - `NODE_ENV=test` or `ROUTING_PROVIDER=mock` -> deterministic `MockRoutingProvider`
  - otherwise `OsrmRoutingProvider`
- Trip route snapshots are persisted in `TripRoute`.

ETA endpoint:
- `GET /api/geo/trip/:tripId/eta`
- Calculates ETA from last known driver location to trip destination.

## POI and radar alerts
- POI storage table: `Poi` (PostGIS point + GiST index)
- User endpoints:
  - `GET /api/poi/nearby`
  - `POST /api/poi/route`
- Admin CRUD:
  - `POST /api/admin/poi`
  - `GET /api/admin/poi`
  - `PATCH /api/admin/poi/:id`
  - `DELETE /api/admin/poi/:id`

Radar flow on location update:
- finds POIs near current driver position (default radius up to 1500m)
- emits `trip.radar.alert` over websocket to trip participants
- dedup key in Redis:
  - `radar_alert:{tripId}:{poiId}`
  - TTL: 600 seconds
