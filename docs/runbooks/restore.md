# Runbook: Postgres Restore

## Purpose
Restore a database from a backup created by `pg_dump`.

## Preconditions
- `pg_restore` installed and on PATH
- `DATABASE_URL` configured for the target database
- Target database is provisioned and reachable

## Steps
1. Ensure application is in maintenance mode or scaled down.
2. Run restore script:
   ```bash
   DATABASE_URL="postgresql://user:pass@host:5432/intercity?schema=public" \
   ./scripts/restore_postgres.sh backups/intercity_20250101T000000Z.dump
   ```
3. Verify schema and key tables exist.
4. Bring application back online and monitor logs/metrics.

## Notes
- Restore is destructive (`--clean --if-exists`).
- Prefer restoring into a fresh database for validation, then swap.
