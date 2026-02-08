export const USER_ROLES = [
  'passenger',
  'driver',
  'admin',
  'moderator',
  'finance',
  'support',
  'ops',
  'superadmin',
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ADMIN_ROLES = ['admin', 'moderator', 'superadmin'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const MOBILE_ROLES = ['passenger', 'driver'] as const;
export type MobileRole = (typeof MOBILE_ROLES)[number];

export const OPS_ROLES = ['ops', 'support', 'finance', 'superadmin'] as const;
export type OpsRole = (typeof OPS_ROLES)[number];
