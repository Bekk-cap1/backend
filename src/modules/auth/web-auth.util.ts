import { ForbiddenException } from '@nestjs/common';
import type { Request, Response } from 'express';

export const AUTH_REFRESH_COOKIE = 'refresh_token';
export const AUTH_SESSION_COOKIE = 'admin_session';
export const AUTH_CSRF_COOKIE = 'csrf_token';
export const AUTH_CSRF_HEADER = 'x-csrf-token';

type AuthCookieInput = {
  refreshToken: string;
  csrfToken: string;
};

function cookieBaseOptions() {
  const secure =
    String(
      process.env.AUTH_COOKIE_SECURE ?? process.env.NODE_ENV === 'production',
    ) === 'true';
  const domain = process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined;
  const sameSite = secure ? 'none' : 'lax';

  return { secure, domain, sameSite } as const;
}

export function setWebAuthCookies(res: Response, input: AuthCookieInput) {
  const { secure, domain, sameSite } = cookieBaseOptions();
  const refreshTtlSec = Number(
    process.env.JWT_REFRESH_TTL ??
      process.env.AUTH_REFRESH_COOKIE_TTL_SEC ??
      2_592_000,
  );

  res.cookie(AUTH_REFRESH_COOKIE, input.refreshToken, {
    httpOnly: true,
    secure,
    sameSite,
    domain,
    path: '/',
    maxAge: refreshTtlSec * 1000,
  });
  res.cookie(AUTH_SESSION_COOKIE, '1', {
    httpOnly: true,
    secure,
    sameSite,
    domain,
    path: '/',
    maxAge: refreshTtlSec * 1000,
  });
  // CSRF token is intentionally readable by JS (double-submit cookie pattern).
  res.cookie(AUTH_CSRF_COOKIE, input.csrfToken, {
    httpOnly: false,
    secure,
    sameSite,
    domain,
    path: '/',
    maxAge: refreshTtlSec * 1000,
  });
}

export function clearWebAuthCookies(res: Response) {
  const { secure, domain, sameSite } = cookieBaseOptions();
  const base = { secure, sameSite, domain, path: '/' } as const;
  res.clearCookie(AUTH_REFRESH_COOKIE, base);
  res.clearCookie(AUTH_SESSION_COOKIE, base);
  res.clearCookie(AUTH_CSRF_COOKIE, base);
}

export function parseCookies(req: Request): Record<string, string> {
  const raw = req.headers.cookie;
  if (!raw) return {};

  return raw.split(';').reduce<Record<string, string>>((acc, part) => {
    const idx = part.indexOf('=');
    if (idx <= 0) return acc;
    const key = decodeURIComponent(part.slice(0, idx).trim());
    const value = decodeURIComponent(part.slice(idx + 1).trim());
    acc[key] = value;
    return acc;
  }, {});
}

export function assertCsrf(req: Request) {
  const cookies = parseCookies(req);
  const fromCookie = cookies[AUTH_CSRF_COOKIE];
  const fromHeader = req.headers[AUTH_CSRF_HEADER] as string | undefined;

  if (!fromCookie || !fromHeader || fromCookie !== fromHeader) {
    throw new ForbiddenException('CSRF validation failed');
  }
}
