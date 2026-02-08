import type { ApiClient } from '../core/http-client';

export const bookingsApi = (api: ApiClient) => ({
  my: () => api.request('get', '/api/bookings/my'),
  myAlias: () => api.request('get', '/api/bookings/me'),
  driver: () => api.request('get', '/api/driver/bookings'),
  driverAlias: () => api.request('get', '/api/bookings/driver'),
  getById: (id: string) => api.client.get(`/api/bookings/${id}`).then((r) => r.data),
  cancel: (id: string) => api.client.post(`/api/bookings/${id}/cancel`).then((r) => r.data),
  cancelByDriver: (id: string) =>
    api.client.post(`/api/bookings/${id}/cancel-by-driver`).then((r) => r.data),
  complete: (id: string) => api.client.post(`/api/bookings/${id}/complete`).then((r) => r.data),
});
