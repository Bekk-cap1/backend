import type { ApiClient } from '../core/http-client';

export const notificationsApi = (api: ApiClient) => ({
  listMine: (params?: Record<string, unknown>) =>
    api.request('get', '/api/notifications/my', { params }),
  markRead: (id: string) =>
    api.client.post(`/api/notifications/${id}/read`).then((response) => response.data),
  registerDevice: (body: { token: string; platform?: string; model?: string }) =>
    api.client.post('/api/notifications/devices', body).then((response) => response.data),
});
