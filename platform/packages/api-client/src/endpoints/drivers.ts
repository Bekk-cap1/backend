import type { ApiClient } from '../core/http-client';

export const driversApi = (api: ApiClient) => ({
  me: () => api.request('get', '/api/drivers/me'),
  upsertProfile: (body: Record<string, unknown>) =>
    api.request('post', '/api/drivers/profile', { body: body as never }),
  submitVerification: (body: { docs: Record<string, unknown>; notes?: string }) =>
    api.request('post', '/api/drivers/submit', { body: body as never }),
  listAdmin: (params?: Record<string, unknown>) =>
    api.request('get', '/api/v1/admin/drivers', { params }),
  verify: (userId: string) =>
    api.client.post(`/api/v1/admin/drivers/${userId}/verify`).then((response) => response.data),
  reject: (userId: string, body: { reason?: string }) =>
    api.client.post(`/api/v1/admin/drivers/${userId}/reject`, body).then((response) => response.data),
});

