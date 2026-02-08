import type { ApiClient } from '../core/http-client';

export const offersApi = (api: ApiClient) => ({
  listByRequest: (requestId: string) =>
    api.client.get(`/api/requests/${requestId}/offers`).then((response) => response.data),
  create: (requestId: string, body: Record<string, unknown>) =>
    api.client.post(`/api/requests/${requestId}/offers`, body).then((response) => response.data),
  accept: (offerId: string) =>
    api.client.patch(`/api/offers/${offerId}/accept`).then((response) => response.data),
  reject: (offerId: string) =>
    api.client.patch(`/api/offers/${offerId}/reject`).then((response) => response.data),
  cancel: (offerId: string) =>
    api.client.patch(`/api/offers/${offerId}/cancel`).then((response) => response.data),
});

