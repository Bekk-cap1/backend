import type { UserRole } from './roles';
import { canRole, listRolePermissions, type PermissionAction } from './permissions';

export type RbacCheckInput = {
  role: UserRole;
  permission: PermissionAction;
};

export function assertRolePermission(input: RbacCheckInput): void {
  if (!canRole(input.role, input.permission)) {
    throw new Error(`role ${input.role} is not allowed to perform ${input.permission}`);
  }
}

export const RBAC_MATRIX: Record<UserRole, PermissionAction[]> = {
  passenger: [],
  driver: [],
  admin: listRolePermissions('admin'),
  moderator: listRolePermissions('moderator'),
  finance: listRolePermissions('finance'),
  support: listRolePermissions('support'),
  ops: listRolePermissions('ops'),
  superadmin: listRolePermissions('superadmin'),
};

