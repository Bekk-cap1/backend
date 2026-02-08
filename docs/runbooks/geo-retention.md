# Runbook: Geo Retention

## Purpose
Control privacy and storage by deleting old rows from `DriverLocationSample`.

## Scheduler
- Service: `GeoRetentionService`
- Default cron: `0 3 * * *`

## Controls
- `GEO_RETENTION_ENABLED=true|false`
- `GEO_RETENTION_CRON`
- `GEO_LOCATION_RETENTION_DAYS` (default `30`)
- `GEO_RETENTION_LOCK_SEC` (default `300`)

## What it does
1. Acquires Redis lock (`locks:geo:retention`).
2. Deletes samples older than configured retention.
3. Emits metrics (`geo_retention_cleanup`).

## Manual validation
```bash
SELECT count(*) FROM "DriverLocationSample" WHERE "capturedAt" < NOW() - INTERVAL '30 days';
```
