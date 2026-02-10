import { normalizeApiError } from '@platform/api-client';
import { appConfig } from './config';

function firstFieldError(fields: Record<string, string[] | string> | undefined): string | null {
  if (!fields) return null;
  for (const value of Object.values(fields)) {
    if (Array.isArray(value) && value.length) return value[0];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

export function toErrorMessage(error: unknown, fallback = 'Something went wrong. Try again.') {
  const normalized = normalizeApiError(error);
  const message = normalized.message?.toLowerCase() ?? '';

  if (normalized.status === 401) {
    return 'Wrong credentials. Try again.';
  }

  if (normalized.status === 403) {
    return 'You are not allowed to perform this action.';
  }

  if (normalized.status === 404) {
    return 'Requested endpoint was not found.';
  }

  if (normalized.status === 409) {
    return normalized.message || 'Request conflict. Please refresh and retry.';
  }

  if (normalized.status === 429) {
    if (message.includes('seconds')) {
      return normalized.message;
    }
    return 'Too many attempts. Please wait about a minute and try again.';
  }

  if (normalized.status === 400) {
    const msg = message;
    const fieldMessage = firstFieldError(normalized.fields);

    if (
      normalized.code === 'PRISMA_P2021' ||
      normalized.code === 'PRISMA_P2022' ||
      msg.includes('database request error') ||
      msg.includes('schema')
    ) {
      return 'Database schema is out of sync. Run migrations and restart backend.';
    }

    if (msg.includes('user already exists')) {
      return 'This phone number is already registered. Please sign in.';
    }

    if (msg.includes('invalid credentials')) {
      return 'Wrong phone or password.';
    }

    if (fieldMessage) {
      return fieldMessage;
    }

    if (msg.includes('validation failed') || msg.includes('bad request')) {
      return 'Check input values and try again.';
    }
  }

  if (normalized.status === 404 && message.includes('cannot get')) {
    return 'Endpoint is missing on backend. Check API prefix and backend version.';
  }

  if (normalized.type === 'network') {
    return `Cannot connect to server (${appConfig.apiBaseUrl}). If you use a real phone, set EXPO_PUBLIC_API_BASE_URL to your PC LAN IP, e.g. http://192.168.1.10:3000`;
  }

  return normalized.message || fallback;
}

export function isNetworkError(error: unknown): boolean {
  return normalizeApiError(error).type === 'network';
}
