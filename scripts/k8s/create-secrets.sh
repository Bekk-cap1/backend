#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-intercity}"
ENV_FILE="${ENV_FILE:-.env}"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

if [[ -z "${JWT_ACCESS_SECRET:-}" && -n "${JWT_SECRET:-}" ]]; then
  JWT_ACCESS_SECRET="${JWT_SECRET}"
fi
if [[ -z "${JWT_REFRESH_SECRET:-}" && -n "${JWT_SECRET:-}" ]]; then
  JWT_REFRESH_SECRET="${JWT_SECRET}"
fi

require() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required env: ${name}" >&2
    exit 1
  fi
}

require DATABASE_URL
require REDIS_URL
require JWT_ACCESS_SECRET
require JWT_REFRESH_SECRET

args=(
  "--from-literal=DATABASE_URL=${DATABASE_URL}"
  "--from-literal=REDIS_URL=${REDIS_URL}"
  "--from-literal=JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}"
  "--from-literal=JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}"
)

if [[ -n "${SHADOW_DATABASE_URL:-}" ]]; then
  args+=("--from-literal=SHADOW_DATABASE_URL=${SHADOW_DATABASE_URL}")
fi

if [[ -n "${SENTRY_DSN:-}" ]]; then
  args+=("--from-literal=SENTRY_DSN=${SENTRY_DSN}")
fi
if [[ -n "${SENTRY_ENV:-}" ]]; then
  args+=("--from-literal=SENTRY_ENV=${SENTRY_ENV}")
fi
if [[ -n "${SENTRY_RELEASE:-}" ]]; then
  args+=("--from-literal=SENTRY_RELEASE=${SENTRY_RELEASE}")
fi

kubectl -n "${NAMESPACE}" create secret generic intercity-secrets \
  "${args[@]}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Secret intercity-secrets applied in namespace ${NAMESPACE}"
