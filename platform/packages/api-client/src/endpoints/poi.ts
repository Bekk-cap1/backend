import type { ApiClient } from '../core/http-client';

export const poiApi = (api: ApiClient) => ({
  listNearby: (params: { lat: number; lon: number; radiusMeters?: number }) =>
    api.request('get', '/api/poi/nearby', { params }),
  alongRoute: (body: { polyline: string; bufferMeters?: number; types?: string[] }) =>
    api.request('post', '/api/poi/route', { body: body as never }),
  create: (body: Record<string, unknown>) =>
    api.request('post', '/api/admin/poi', { body: body as never }),
  list: (params?: Record<string, unknown>) =>
    api.request('get', '/api/admin/poi', { params }),
  update: (id: string, body: Record<string, unknown>) =>
    api.client.patch(`/api/admin/poi/${id}`, body).then((r) => r.data),
  remove: (id: string) => api.client.delete(`/api/admin/poi/${id}`).then((r) => r.data),
  importCsv: (body: { rows: Array<Record<string, unknown>> }) =>
    api.request('post', '/api/admin/poi/import', { body: body as never }),
  listReports: (params?: Record<string, unknown>) =>
    api.request('get', '/api/admin/poi/reports', { params }),
  approveReport: (id: string) =>
    api.client.post(`/api/admin/poi/reports/${id}/approve`).then((r) => r.data),
  rejectReport: (id: string) =>
    api.client.post(`/api/admin/poi/reports/${id}/reject`).then((r) => r.data),
  createReport: (body: Record<string, unknown>) =>
    api.request('post', '/api/poi/reports', { body: body as never }),
});
