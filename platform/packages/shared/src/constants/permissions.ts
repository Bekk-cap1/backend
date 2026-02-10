import { z } from 'zod';
import { ADMIN_ROLES, MOBILE_ROLES, USER_ROLES, type UserRole } from './roles';

export const adminRoleSchema = z.enum(ADMIN_ROLES);
export const mobileRoleSchema = z.enum(MOBILE_ROLES);
export const userRoleSchema = z.enum(USER_ROLES);

export type PermissionAction =
  | '*'
  | 'users.list'
  | 'users.manage'
  | 'users.changeRole'
  | 'users.ban'
  | 'users.unban'
  | 'drivers.list'
  | 'drivers.verify'
  | 'drivers.reject'
  | 'trips.list'
  | 'bookings.list'
  | 'payments.list'
  | 'poi.manage'
  | 'poi.list'
  | 'poi.create'
  | 'poi.update'
  | 'poi.delete'
  | 'poi.import'
  | 'poi.reports'
  | 'poi.report.approve'
  | 'poi.report.reject'
  | 'tickets.list'
  | 'tickets.status'
  | 'tickets.manage'
  | 'payments.markPaid'
  | 'payments.manage'
  | 'audit.list'
  | 'audit.read';

const permissionMatrix: Record<PermissionAction, readonly UserRole[]> = {
  '*': ['superadmin'],
  'users.list': ['admin', 'moderator', 'support', 'superadmin'],
  'users.manage': ['admin', 'moderator', 'superadmin'],
  'users.changeRole': ['admin', 'superadmin'],
  'users.ban': ['admin', 'moderator', 'superadmin'],
  'users.unban': ['admin', 'moderator', 'superadmin'],
  'drivers.list': ['admin', 'moderator', 'support', 'superadmin'],
  'drivers.verify': ['admin', 'moderator', 'superadmin'],
  'drivers.reject': ['admin', 'moderator', 'superadmin'],
  'trips.list': ['admin', 'moderator', 'ops', 'support', 'superadmin'],
  'bookings.list': ['admin', 'moderator', 'ops', 'support', 'superadmin'],
  'payments.list': ['admin', 'finance', 'superadmin'],
  'poi.manage': ['admin', 'moderator', 'ops', 'superadmin'],
  'poi.list': ['admin', 'moderator', 'ops', 'support', 'superadmin'],
  'poi.create': ['admin', 'moderator', 'ops', 'superadmin'],
  'poi.update': ['admin', 'moderator', 'ops', 'superadmin'],
  'poi.delete': ['admin', 'superadmin'],
  'poi.import': ['admin', 'ops', 'superadmin'],
  'poi.reports': ['admin', 'moderator', 'support', 'superadmin'],
  'poi.report.approve': ['admin', 'moderator', 'superadmin'],
  'poi.report.reject': ['admin', 'moderator', 'superadmin'],
  'tickets.list': ['admin', 'moderator', 'support', 'superadmin'],
  'tickets.status': ['admin', 'moderator', 'support', 'superadmin'],
  'tickets.manage': ['admin', 'moderator', 'support', 'superadmin'],
  'payments.markPaid': ['admin', 'finance', 'superadmin'],
  'payments.manage': ['admin', 'finance', 'superadmin'],
  'audit.list': ['admin', 'moderator', 'ops', 'finance', 'support', 'superadmin'],
  'audit.read': ['admin', 'moderator', 'ops', 'finance', 'support', 'superadmin'],
};

export function canRole(role: UserRole, action: PermissionAction): boolean {
  if (role === 'superadmin') return true;
  return permissionMatrix[action].includes(role);
}

export function listRolePermissions(role: UserRole): PermissionAction[] {
  return (Object.keys(permissionMatrix) as PermissionAction[]).filter((action) =>
    permissionMatrix[action].includes(role),
  );
}
