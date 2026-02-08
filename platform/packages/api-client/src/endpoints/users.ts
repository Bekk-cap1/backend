import type { ApiClient } from '../core/http-client';

export const usersApi = (api: ApiClient) => ({
  me: () => api.request('get', '/api/auth/me'),
  listAdmin: (params?: Record<string, unknown>) =>
    api.request('get', '/api/v1/admin/users', { params }),
  ban: (userId: string, body: { reason?: string }) =>
    api.client.post(`/api/v1/admin/users/${userId}/ban`, body).then((response) => response.data),
  unban: (userId: string) =>
    api.client.post(`/api/v1/admin/users/${userId}/unban`).then((response) => response.data),
  changeRole: (
    userId: string,
    body: { role: 'passenger' | 'driver' | 'admin' | 'moderator' | 'support' | 'finance' | 'ops' | 'superadmin' },
  ) => api.client.patch(`/api/v1/admin/users/${userId}/role`, body).then((response) => response.data),
});

