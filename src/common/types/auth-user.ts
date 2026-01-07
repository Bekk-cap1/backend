import type { Role } from '@prisma/client';

export type AuthUser = {
  sub: string;
  id?: string;
  phone?: string;
  role?: Role;
  profile?: unknown;
  sid?: string;
};
