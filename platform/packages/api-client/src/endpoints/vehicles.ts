import type { ApiClient } from '../core/http-client';

export const vehiclesApi = (api: ApiClient) => ({
  listMine: (params?: Record<string, unknown>) =>
    api.request('get', '/api/vehicles/my', { params }),
  listMineAlias: (params?: Record<string, unknown>) =>
    api.request('get', '/api/vehicles', { params }),
  create: (body: Record<string, unknown>) =>
    api.request('post', '/api/vehicles', { body: body as never }),
  update: (id: string, body: Record<string, unknown>) =>
    api.client.patch(`/api/vehicles/${id}`, body).then((r) => r.data),
  remove: (id: string) => api.client.delete(`/api/vehicles/${id}`).then((r) => r.data),
});
