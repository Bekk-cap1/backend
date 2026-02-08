import { describe, expect, it } from 'vitest';
import { canRole, listRolePermissions } from '../constants/permissions';
import { dateRangeSchema } from '../schemas/dates';
import { moneySchema } from '../schemas/money';

describe('permissions', () => {
  it('allows admin actions for admin role', () => {
    expect(canRole('admin', 'users.manage')).toBe(true);
    expect(canRole('admin', 'payments.manage')).toBe(true);
  });

  it('allows superadmin for destructive actions', () => {
    expect(canRole('superadmin', 'users.changeRole')).toBe(true);
    expect(canRole('superadmin', 'poi.delete')).toBe(true);
  });

  it('denies passenger access to admin actions', () => {
    expect(canRole('passenger', 'users.manage')).toBe(false);
    expect(canRole('passenger', 'audit.read')).toBe(false);
  });

  it('returns permission list by role', () => {
    const permissions = listRolePermissions('support');
    expect(permissions).toContain('tickets.list');
    expect(permissions).not.toContain('users.changeRole');
  });
});

describe('schemas', () => {
  it('validates money schema', () => {
    const value = moneySchema.parse({ amount: 120000, currency: 'uzs' });
    expect(value.currency).toBe('UZS');
  });

  it('validates date range ordering', () => {
    expect(() =>
      dateRangeSchema.parse({
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-02T00:00:00.000Z',
      }),
    ).not.toThrow();
  });

  it('rejects invalid date range ordering', () => {
    expect(() =>
      dateRangeSchema.parse({
        from: '2026-01-03T00:00:00.000Z',
        to: '2026-01-02T00:00:00.000Z',
      }),
    ).toThrow();
  });
});
