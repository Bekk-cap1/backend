import { describe, expect, it } from 'vitest';
import { normalizeApiError } from '../core/errors';

describe('normalizeApiError', () => {
  it('returns network error when response is missing', () => {
    const result = normalizeApiError({ message: 'Network Error' });
    expect(result.type).toBe('network');
    expect(result.message).toBe('Network Error');
  });

  it('returns api error for structured payload', () => {
    const result = normalizeApiError({
      response: {
        status: 400,
        data: { message: 'Validation failed', code: 'VALIDATION_ERROR' },
      },
    });
    expect(result.type).toBe('api');
    expect(result.status).toBe(400);
    expect(result.code).toBe('VALIDATION_ERROR');
  });
});

