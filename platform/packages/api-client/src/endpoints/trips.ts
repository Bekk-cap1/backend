import type { ApiClient } from '../core/http-client';

export const tripsApi = (api: ApiClient) => ({
  search: (params?: Record<string, unknown>) =>
    api.request('get', '/api/trips/search', { params }),
  list: (params?: Record<string, unknown>) => api.request('get', '/api/trips', { params }),
  getById: (id: string) => api.client.get(`/api/trips/${id}`).then((r) => r.data),
  create: (body: Record<string, unknown>) =>
    api.request('post', '/api/trips', { body: body as never }),
  update: (id: string, body: Record<string, unknown>) =>
    api.client.patch(`/api/trips/${id}`, body).then((r) => r.data),
  publish: (id: string, body?: Record<string, unknown>) =>
    api.client.patch(`/api/trips/${id}/publish`, body ?? {}).then((r) => r.data),
  publishLegacy: (id: string, body?: Record<string, unknown>) =>
    api.client.post(`/api/trips/${id}/publish`, body ?? {}).then((r) => r.data),
  start: (id: string) => api.client.patch(`/api/trips/${id}/start`).then((r) => r.data),
  startLegacy: (id: string) => api.client.post(`/api/trips/${id}/start`).then((r) => r.data),
  complete: (id: string) => api.client.patch(`/api/trips/${id}/complete`).then((r) => r.data),
  completeLegacy: (id: string) => api.client.post(`/api/trips/${id}/complete`).then((r) => r.data),
  cancel: (id: string) => api.client.patch(`/api/trips/${id}/cancel`).then((r) => r.data),
  cancelLegacy: (id: string) => api.client.post(`/api/trips/${id}/cancel`).then((r) => r.data),
  createRequest: (tripId: string, body: Record<string, unknown>) =>
    api.client.post(`/api/trips/${tripId}/requests`, body).then((r) => r.data),
  myRequestsForTrip: (tripId: string) =>
    api.client.get(`/api/trips/${tripId}/requests/me`).then((r) => r.data),
  acceptRequest: (tripId: string, requestId: string) =>
    api.client.post(`/api/trips/${tripId}/requests/${requestId}/accept`).then((r) => r.data),
  rejectRequest: (tripId: string, requestId: string) =>
    api.client.post(`/api/trips/${tripId}/requests/${requestId}/reject`).then((r) => r.data),
});
