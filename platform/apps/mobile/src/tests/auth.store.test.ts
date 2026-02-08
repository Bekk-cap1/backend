import { describe, expect, it } from 'vitest';
import { authReducer, initialAuthState, resolveStatusByRole } from '../stores/auth/auth.store';

describe('auth.store', () => {
  it('transitions to authenticated on mobile roles', () => {
    const next = authReducer(initialAuthState, {
      type: 'auth:login',
      payload: {
        user: { id: 'u1', phone: '+998900000001', role: 'passenger' },
        accessToken: 'a1',
        refreshToken: 'r1',
      },
    });

    expect(next.status).toBe('authenticated');
    expect(next.user?.role).toBe('passenger');
    expect(next.accessToken).toBe('a1');
  });

  it('transitions to blocked on admin roles', () => {
    expect(resolveStatusByRole('admin')).toBe('blocked');

    const next = authReducer(initialAuthState, {
      type: 'auth:login',
      payload: {
        user: { id: 'u2', phone: '+998900000002', role: 'admin' },
        accessToken: 'a2',
      },
    });

    expect(next.status).toBe('blocked');
  });

  it('clears session on logout', () => {
    const withSession = {
      status: 'authenticated' as const,
      user: { id: 'u3', phone: '+998900000003', role: 'driver' as const },
      accessToken: 'a3',
      refreshToken: 'r3',
    };

    const next = authReducer(withSession, { type: 'auth:logout' });
    expect(next.status).toBe('anonymous');
    expect(next.user).toBeNull();
    expect(next.accessToken).toBeNull();
  });
});
