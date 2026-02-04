# Runbook: Postgres Backup

## Purpose
Create an on-demand backup of the production database.

## Preconditions
- `pg_dump` installed and on PATH
- `DATABASE_URL` configured for the target database

## Steps
1. Export `DATABASE_URL`.
2. Run backup script:
   ```bash
   DATABASE_URL="postgresql://user:pass@host:5432/intercity?schema=public" \
   ./scripts/backup_postgres.sh backups
   ```
3. Verify the output file exists in `backups/`.

## Notes
- Backups are created in `pg_dump` custom format (`.dump`).
- Store backups in secure, encrypted storage (e.g., S3 with KMS).
