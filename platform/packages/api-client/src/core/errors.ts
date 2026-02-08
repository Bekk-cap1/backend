import type { AxiosError } from 'axios';

export type NormalizedApiError = {
  type: 'network' | 'api' | 'unknown';
  status?: number;
  code?: string;
  message: string;
  fields?: Record<string, string[] | string>;
};

export function normalizeApiError(error: unknown): NormalizedApiError {
  const fallback: NormalizedApiError = {
    type: 'unknown',
    message: 'Unknown error',
  };

  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const maybeAxios = error as AxiosError<{ message?: string | string[]; code?: string; errors?: Record<string, string[] | string> }>;

  if (!maybeAxios.response) {
    return {
      type: 'network',
      message: maybeAxios.message || 'Network error',
    };
  }

  const status = maybeAxios.response.status;
  const payload = maybeAxios.response.data;
  const message = Array.isArray(payload?.message)
    ? payload.message.join(', ')
    : payload?.message ?? maybeAxios.message ?? `HTTP ${status}`;

  return {
    type: 'api',
    status,
    code: payload?.code,
    message,
    fields: payload?.errors,
  };
}

