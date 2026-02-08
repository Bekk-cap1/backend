import type { ApiClient } from '../core/http-client';

export const requestsApi = (api: ApiClient) => ({
  listMine: () => api.client.get('/api/requests/my').then((r) => r.data),
  offers: (requestId: string) =>
    api.client.get(`/api/requests/${requestId}/offers`).then((r) => r.data),
  createOffer: (requestId: string, body: Record<string, unknown>) =>
    api.client.post(`/api/requests/${requestId}/offers`, body).then((r) => r.data),
  negotiation: (requestId: string) =>
    api.client.get(`/api/requests/${requestId}/negotiation`).then((r) => r.data),
  cancelRequest: (requestId: string) =>
    api.client.post(`/api/requests/${requestId}/cancel`).then((r) => r.data),
  driverQueue: () => api.client.get('/api/driver/requests').then((r) => r.data),
});
