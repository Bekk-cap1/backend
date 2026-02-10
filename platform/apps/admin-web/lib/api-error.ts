import { normalizeApiError } from '@platform/api-client';

function flattenFields(fields: Record<string, string[] | string> | undefined): string {
  if (!fields) return '';
  const parts = Object.entries(fields).map(([key, value]) => {
    if (Array.isArray(value)) {
      return `${key}: ${value.join(', ')}`;
    }
    return `${key}: ${value}`;
  });
  return parts.join(' | ');
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const normalized = normalizeApiError(error);
  const status = normalized.status;
  const rawMessage = normalized.message?.trim();
  let base = rawMessage || fallback;
  const lower = rawMessage?.toLowerCase() ?? '';

  if (lower.includes('database request error')) {
    base = 'Database schema or query mismatch. Run migrations and restart backend.';
  }

  if (lower.includes('relation') && lower.includes('does not exist')) {
    base = 'Database schema is out of date. Run migrations and restart backend.';
  }

  if (!rawMessage || rawMessage === 'Request failed with status code 401') {
    if (status === 401) {
      base = 'Session expired. Please sign in again.';
    }
  }

  if (!rawMessage || rawMessage === 'Request failed with status code 429') {
    if (status === 429) {
      base = 'Too many requests. Wait a minute and try again.';
    }
  }

  if (!rawMessage || rawMessage === 'Request failed with status code 404') {
    if (status === 404) {
      base = 'Endpoint not found in current backend. Check backend route version and restart server.';
    }
  }

  if (!rawMessage || rawMessage === 'Request failed with status code 400') {
    if (status === 400 && normalized.code?.startsWith('PRISMA_P20')) {
      base = 'Database schema is not in sync. Run migrations and restart backend.';
    } else if (status === 400) {
      base = 'Bad request. Please check form values and try again.';
    }
  }

  if (status === 401) {
    base = 'Session expired. Please sign in again.';
  }

  if (status === 403) {
    base = 'You do not have permission for this action.';
  }

  if (status === 429) {
    base = 'Too many requests. Please wait 60 seconds and try again.';
  }

  const fields = flattenFields(normalized.fields);
  return fields ? `${base}. ${fields}` : base;
}

export function getApiErrorStatus(error: unknown): number | undefined {
  return normalizeApiError(error).status;
}
