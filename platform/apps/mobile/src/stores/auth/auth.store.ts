import type { UserRole } from '@platform/shared';

export type AuthStatus = 'bootstrapping' | 'anonymous' | 'authenticated' | 'blocked';

export type AuthUser = {
  id: string;
  phone: string;
  role: UserRole;
};

export type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
};

export type AuthAction =
  | { type: 'bootstrap:anonymous' }
  | { type: 'bootstrap:authenticated'; payload: { user: AuthUser; accessToken: string; refreshToken?: string } }
  | { type: 'auth:login'; payload: { user: AuthUser; accessToken: string; refreshToken?: string } }
  | { type: 'auth:blocked'; payload: { user: AuthUser; accessToken: string; refreshToken?: string } }
  | { type: 'auth:logout' };

export const initialAuthState: AuthState = {
  status: 'bootstrapping',
  user: null,
  accessToken: null,
  refreshToken: null,
};

const blockedRoles = new Set<UserRole>(['admin', 'moderator', 'finance', 'support', 'ops', 'superadmin']);

export function resolveStatusByRole(role: UserRole): AuthStatus {
  return blockedRoles.has(role) ? 'blocked' : 'authenticated';
}

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'bootstrap:anonymous':
      return { ...state, status: 'anonymous', user: null, accessToken: null, refreshToken: null };
    case 'bootstrap:authenticated':
    case 'auth:login': {
      return {
        status: resolveStatusByRole(action.payload.user.role),
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken ?? null,
      };
    }
    case 'auth:blocked':
      return {
        status: 'blocked',
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken ?? null,
      };
    case 'auth:logout':
      return { ...state, status: 'anonymous', user: null, accessToken: null, refreshToken: null };
    default:
      return state;
  }
}
