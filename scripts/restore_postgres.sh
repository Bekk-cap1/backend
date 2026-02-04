#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: DATABASE_URL=... ./scripts/restore_postgres.sh <backup_file.dump>" >&2
  exit 1
fi

BACKUP_FILE="$1"

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "Backup file not found: ${BACKUP_FILE}" >&2
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_restore is not installed or not in PATH" >&2
  exit 1
fi

pg_restore --clean --if-exists --no-owner --no-acl --dbname "${DATABASE_URL}" "${BACKUP_FILE}"

echo "Restore completed from: ${BACKUP_FILE}"
