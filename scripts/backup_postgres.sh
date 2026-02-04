#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

OUT_DIR="${1:-backups}"
TS="$(date -u +"%Y%m%dT%H%M%SZ")"
FILE="${OUT_DIR}/intercity_${TS}.dump"

mkdir -p "${OUT_DIR}"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is not installed or not in PATH" >&2
  exit 1
fi

pg_dump --format=custom --no-owner --no-acl "${DATABASE_URL}" > "${FILE}"

echo "Backup created: ${FILE}"
