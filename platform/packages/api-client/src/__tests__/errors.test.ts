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
    expect(result.message).toBe('Validation failed');
  });

  it('extracts nested backend envelope errors', () => {
    const result = normalizeApiError({
      response: {
        status: 400,
        data: {
          ok: false,
          error: {
            code: 'HTTP_400',
            message: 'User already exists',
            details: { statusCode: 400 },
          },
        },
      },
    });

    expect(result.type).toBe('api');
    expect(result.status).toBe(400);
    expect(result.code).toBe('HTTP_400');
    expect(result.message).toBe('User already exists');
  });
});

