import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { UserRole } from '@platform/shared';
import { api, setApiUnauthorizedHandler } from '../../api/client';
import { mobileTokenStore } from '../../api/tokenStore';
import { unwrapPayload } from '../../api/mappers/dto';
import { logger } from '../../core/logger';
import { authReducer, initialAuthState, resolveStatusByRole, type AuthUser } from './auth.store';

type AuthContextValue = {
  state: typeof initialAuthState;
  login: (phone: string, password: string) => Promise<void>;
  register: (input: {
    phone: string;
    password: string;
    fullName: string;
    language?: 'ru' | 'uz' | 'en';
    cityId?: string;
    referralCode?: string;
    acceptTerms: boolean;
  }) => Promise<void>;
  logout: () => Promise<void>;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  requestPasswordReset: (phone: string) => Promise<void>;
  confirmPasswordReset: (phone: string, code: string, newPassword: string) => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const allowedRoles: UserRole[] = [
  'passenger',
  'driver',
  'admin',
  'moderator',
  'finance',
  'support',
  'ops',
  'superadmin',
];

function normalizeRole(role: unknown): UserRole {
  const raw = String(role ?? '').trim().toLowerCase();
  if (allowedRoles.includes(raw as UserRole)) {
    return raw as UserRole;
  }
  return 'support';
}

function getUserFromPayload(payload: unknown): AuthUser {
  const data = unwrapPayload<any>(payload);
  const user = data?.user ?? data;

  return {
    id: String(user.id),
    phone: String(user.phone),
    role: normalizeRole(user.role),
  };
}

function getTokens(payload: unknown): { accessToken: string; refreshToken?: string } {
  const data = unwrapPayload<any>(payload);
  return {
    accessToken: String(data?.accessToken ?? ''),
    refreshToken: data?.refreshToken ? String(data.refreshToken) : undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  const logout = useCallback(async () => {
    try {
      const refreshToken = await mobileTokenStore.getRefreshToken();
      if (refreshToken) {
        await api.auth.logout({ refreshToken });
      }
    } catch (error) {
      logger.warn('logout request failed', { error: error instanceof Error ? error.message : 'unknown' });
    } finally {
      await mobileTokenStore.clear();
      dispatch({ type: 'auth:logout' });
    }
  }, []);

  const refreshMe = useCallback(async () => {
    const me = await api.auth.me();
    const user = getUserFromPayload(me);
    dispatch({
      type: user.role === 'passenger' || user.role === 'driver' ? 'bootstrap:authenticated' : 'auth:blocked',
      payload: {
        user,
        accessToken: (await mobileTokenStore.getAccessToken()) ?? '',
        refreshToken: (await mobileTokenStore.getRefreshToken()) ?? undefined,
      },
    });
  }, []);

  useEffect(() => {
    setApiUnauthorizedHandler(() => {
      logout().catch(() => undefined);
    });

    return () => setApiUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    const bootstrap = async () => {
      let access = await mobileTokenStore.getAccessToken();
      let refresh = await mobileTokenStore.getRefreshToken();

      if (!access && refresh) {
        try {
          const refreshed = await api.auth.refresh({ refreshToken: refresh });
          const nextTokens = getTokens(refreshed);
          if (!nextTokens.accessToken) {
            throw new Error('Refresh did not return access token');
          }
          await mobileTokenStore.setTokens(nextTokens);
          access = nextTokens.accessToken;
          refresh = nextTokens.refreshToken ?? refresh;
        } catch {
          await mobileTokenStore.clear();
          dispatch({ type: 'bootstrap:anonymous' });
          return;
        }
      }

      if (!access) {
        dispatch({ type: 'bootstrap:anonymous' });
        return;
      }

      try {
        const me = await api.auth.me();
        const user = getUserFromPayload(me);
        dispatch({
          type: resolveStatusByRole(user.role) === 'blocked' ? 'auth:blocked' : 'bootstrap:authenticated',
          payload: { user, accessToken: access, refreshToken: refresh ?? undefined },
        });
      } catch {
        await mobileTokenStore.clear();
        dispatch({ type: 'bootstrap:anonymous' });
      }
    };

    bootstrap().catch(() => dispatch({ type: 'bootstrap:anonymous' }));
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    const result = await api.auth.login({ phone, password });
    const user = getUserFromPayload(result);
    const tokens = getTokens(result);

    await mobileTokenStore.setTokens(tokens);

    dispatch({
      type: resolveStatusByRole(user.role) === 'blocked' ? 'auth:blocked' : 'auth:login',
      payload: { user, ...tokens },
    });
  }, []);

  const register = useCallback(
    async (input: {
      phone: string;
      password: string;
      fullName: string;
      language?: 'ru' | 'uz' | 'en';
      cityId?: string;
      referralCode?: string;
      acceptTerms: boolean;
    }) => {
      await api.auth.register(input);
      await login(input.phone, input.password);
    },
    [login],
  );

  const sendOtp = useCallback(async (phone: string) => {
    await api.auth.sendOtp({ phone });
  }, []);

  const verifyOtp = useCallback(async (phone: string, code: string) => {
    await api.auth.verifyOtp({ phone, code, purpose: 'login' });
  }, []);

  const requestPasswordReset = useCallback(async (phone: string) => {
    await api.auth.requestPasswordReset({ phone });
  }, []);

  const confirmPasswordReset = useCallback(async (phone: string, code: string, newPassword: string) => {
    await api.auth.confirmPasswordReset({ phone, code, newPassword });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      login,
      register,
      logout,
      sendOtp,
      verifyOtp,
      requestPasswordReset,
      confirmPasswordReset,
      refreshMe,
    }),
    [confirmPasswordReset, login, logout, refreshMe, register, requestPasswordReset, sendOtp, state, verifyOtp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used in AuthProvider');
  }
  return context;
}
