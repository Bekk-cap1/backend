import { normalizeApiError } from '@platform/api-client';

export function toErrorMessage(error: unknown, fallback = 'Something went wrong. Try again.') {
  const normalized = normalizeApiError(error);

  if (normalized.status === 401) {
    return 'Wrong credentials. Try again.';
  }

  if (normalized.status === 403) {
    return 'You are not allowed to do this.';
  }

  if (normalized.status === 429) {
    return 'Too many attempts. Try again later.';
  }

  if (normalized.type === 'network') {
    return 'Network error. Check connection.';
  }

  return normalized.message || fallback;
}

export function isNetworkError(error: unknown): boolean {
  return normalizeApiError(error).type === 'network';
}
