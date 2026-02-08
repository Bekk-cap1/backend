'use client';

import { ApiClient, createBrowserStorageTokenStore } from '@platform/api-client';

const tokenStore = createBrowserStorageTokenStore({
  accessKey: 'admin_access_token',
  refreshKey: 'admin_refresh_token',
});

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const item = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!item) return null;
  return decodeURIComponent(item.slice(prefix.length));
}

export const apiClient = new ApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000',
  tokenStore,
  withCredentials: true,
  refreshPath: '/api/auth/web/refresh',
  getCsrfToken: () => getCookieValue('csrf_token'),
  onUnauthorized: async () => {
    await tokenStore.clear();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },
});

export { tokenStore };
