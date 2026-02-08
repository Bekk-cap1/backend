import type { ApiClient } from '../core/http-client';

export const paymentsApi = (api: ApiClient) => ({
  quote: (body: Record<string, unknown>) =>
    api.request('post', '/api/payments/quote', { body: body as never }),
  createIntent: (bookingId: string, body: Record<string, unknown>) =>
    api.client.post(`/api/payments/booking/${bookingId}/intent`, body).then((r) => r.data),
  my: () => api.request('get', '/api/payments/me'),
  myQuotes: () => api.request('get', '/api/payments/quotes/me'),
  markPaid: (paymentId: string, body?: { providerRef?: string }) =>
    api.client.post(`/api/payments/${paymentId}/mark-paid`, body ?? {}).then((r) => r.data),
  listAdmin: (params?: Record<string, unknown>) =>
    api.request('get', '/api/v1/admin/payments', { params }),
});
