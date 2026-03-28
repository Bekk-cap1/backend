import { describe, expect, it } from 'vitest';
import { resolveRoleAccess, resolveRootRoute } from '../app/navigation/route-gate';

describe('navigation role gating', () => {
  it('routes anonymous user to auth stack', () => {
    const route = resolveRootRoute({ status: 'anonymous', user: null });
    expect(route).toBe('AuthStack');
  });

  it('routes passenger to passenger tabs', () => {
    const route = resolveRootRoute({
      status: 'authenticated',
      user: { id: 'u1', phone: '+998901234567', role: 'passenger' },
    });
    expect(route).toBe('PassengerTabs');
  });

  it('routes driver to driver tabs', () => {
    const route = resolveRootRoute({
      status: 'authenticated',
      user: { id: 'u1', phone: '+998901234567', role: 'driver' },
    });
    expect(route).toBe('DriverTabs');
  });

  it('routes admin-like roles to blocked screen', () => {
    const route = resolveRootRoute({
      status: 'authenticated',
      user: { id: 'u1', phone: '+998901234567', role: 'admin' },
    });
    expect(route).toBe('AdminBlocked');

    const access = resolveRoleAccess({
      status: 'authenticated',
      user: { id: 'u2', phone: '+998911112233', role: 'support' },
    });
    expect(access.isBlocked).toBe(true);
    expect(access.isPassenger).toBe(false);
    expect(access.isDriver).toBe(false);
  });
});
