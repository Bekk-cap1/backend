import type { AxiosError } from 'axios';

export type NormalizedApiError = {
  type: 'network' | 'api' | 'unknown';
  status?: number;
  code?: string;
  message: string;
  fields?: Record<string, string[] | string>;
};

type ApiErrorPayload = {
  message?: string | string[];
  code?: string;
  errors?: Record<string, string[] | string>;
  error?: {
    message?: string | string[];
    code?: string;
    details?: {
      message?: string | string[];
      errors?: Record<string, string[] | string>;
    };
  };
};

function firstMessage(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value.join(', ');
  return value;
}

export function normalizeApiError(error: unknown): NormalizedApiError {
  const fallback: NormalizedApiError = {
    type: 'unknown',
    message: 'Unknown error',
  };

  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const maybeAxios = error as AxiosError<ApiErrorPayload>;

  if (!maybeAxios.response) {
    return {
      type: 'network',
      message: maybeAxios.message || 'Network error',
    };
  }

  const status = maybeAxios.response.status;
  const payload = maybeAxios.response.data;
  const message =
    firstMessage(payload?.message) ??
    firstMessage(payload?.error?.message) ??
    firstMessage(payload?.error?.details?.message) ??
    maybeAxios.message ??
    `HTTP ${status}`;

  return {
    type: 'api',
    status,
    code: payload?.code ?? payload?.error?.code,
    message,
    fields: payload?.errors ?? payload?.error?.details?.errors,
  };
}

