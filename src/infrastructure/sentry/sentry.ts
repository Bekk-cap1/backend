import * as Sentry from '@sentry/node';
import { getRequestContext } from '../request-context/request-context';

let enabled = false;

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  const flag = process.env.SENTRY_ENABLED ?? 'true';
  enabled = Boolean(dsn) && String(flag) === 'true';

  if (!enabled) return;

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV ?? 'production',
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
  });
}

export function isSentryEnabled() {
  return enabled;
}

export function captureException(error: unknown) {
  if (!enabled) return;

  const ctx = getRequestContext();
  Sentry.withScope((scope) => {
    if (ctx.requestId) scope.setTag('requestId', ctx.requestId);
    if (ctx.actorRole) scope.setTag('role', ctx.actorRole);
    if (ctx.actorId) scope.setUser({ id: ctx.actorId });
    Sentry.captureException(error);
  });
}
