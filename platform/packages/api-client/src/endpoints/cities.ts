import type { ApiClient } from '../core/http-client';

export const citiesApi = (api: ApiClient) => ({
  list: (params?: { q?: string; limit?: number }) =>
    api.request('get', '/api/cities', { params }),
  getById: (id: string) => api.client.get(`/api/cities/${id}`).then((r) => r.data),
});
