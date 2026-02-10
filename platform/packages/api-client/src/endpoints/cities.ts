import type { ApiClient } from '../core/http-client';

async function withAdminCitiesFallback<T>(
  run: (
    basePath: '/api/v1/admin/cities' | '/api/admin/cities',
  ) => Promise<T>,
) {
  try {
    return await run('/api/v1/admin/cities');
  } catch (error) {
    const status =
      typeof error === 'object' && error && 'response' in error
        ? Number((error as { response?: { status?: number } }).response?.status)
        : NaN;
    if (status !== 404) {
      throw error;
    }
  }

  return run('/api/admin/cities');
}

export const citiesApi = (api: ApiClient) => ({
  list: async (params?: { q?: string; limit?: number }) => {
    try {
      return await api.request('get', '/api/cities', { params });
    } catch (error) {
      const status =
        typeof error === 'object' && error && 'response' in error
          ? Number((error as { response?: { status?: number } }).response?.status)
          : NaN;
      if (status !== 400) {
        throw error;
      }
    }

    try {
      return await api.request('get', '/api/cities', {
        params: { q: params?.q, limit: 20 },
      });
    } catch (error) {
      const status =
        typeof error === 'object' && error && 'response' in error
          ? Number((error as { response?: { status?: number } }).response?.status)
          : NaN;
      if (status !== 400) {
        throw error;
      }
    }

    // Legacy-safe fallback for older/partial backends that reject query params.
    return api.request('get', '/api/cities');
  },
  getById: (id: string) => api.client.get(`/api/cities/${id}`).then((r) => r.data),
  listAdmin: (params?: Record<string, unknown>) =>
    withAdminCitiesFallback((basePath) =>
      api.client.get(basePath, { params }).then((r) => r.data),
    ),
  suggestAdmin: (params: { q: string; limit?: number }) =>
    withAdminCitiesFallback((basePath) =>
      api.client.get(`${basePath}/suggest`, { params }).then((r) => r.data),
    ),
  createAdmin: (body: {
    name: string;
    countryCode?: string;
    region?: string;
    timezone?: string;
    lat?: number;
    lon?: number;
    isActive?: boolean;
    territoryRadiusKm?: number;
  }) =>
    withAdminCitiesFallback((basePath) =>
      api.client.post(basePath, body).then((r) => r.data),
    ),
  updateAdmin: (
    id: string,
    body: {
      name?: string;
      countryCode?: string;
      region?: string;
      timezone?: string;
      lat?: number;
      lon?: number;
      isActive?: boolean;
      territoryRadiusKm?: number;
    },
  ) =>
    withAdminCitiesFallback((basePath) =>
      api.client.patch(`${basePath}/${id}`, body).then((r) => r.data),
    ),
  toggleAdmin: (id: string, isActive?: boolean) =>
    withAdminCitiesFallback((basePath) =>
      api.client
        .patch(`${basePath}/${id}/toggle`, isActive === undefined ? {} : { isActive })
        .then((r) => r.data),
    ),
  removeAdmin: (id: string) =>
    withAdminCitiesFallback((basePath) =>
      api.client.delete(`${basePath}/${id}`).then((r) => r.data),
    ),
});
