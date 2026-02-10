import { Role } from '@prisma/client';

const DEFAULT_SUPERADMIN_PHONE = '+998944692509';

function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, '');
}

export function getSuperAdminPhone(): string {
  const raw = process.env.SUPERADMIN_PHONE ?? DEFAULT_SUPERADMIN_PHONE;
  return normalizePhone(raw);
}

export function isSuperAdminPhone(phone?: string | null): boolean {
  if (!phone) return false;
  return normalizePhone(phone) === getSuperAdminPhone();
}

export function isSuperAdminRole(role?: Role | null): boolean {
  return role === Role.superadmin;
}

export function isSuperAdminImmutable(): boolean {
  const raw = (process.env.SUPERADMIN_IMMUTABLE ?? 'true').trim().toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on';
}
