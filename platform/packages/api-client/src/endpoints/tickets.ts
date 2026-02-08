import type { ApiClient } from '../core/http-client';

export const ticketsApi = (api: ApiClient) => ({
  create: (body: Record<string, unknown>) =>
    api.request('post', '/api/support/tickets', { body: body as never }),
  my: () => api.request('get', '/api/support/tickets/my'),
  listAdmin: (params?: Record<string, unknown>) =>
    api.request('get', '/api/v1/admin/tickets', { params }),
  updateStatus: (ticketId: string, body: { status: string }) =>
    api.client.patch(`/api/v1/admin/tickets/${ticketId}/status`, body).then((r) => r.data),
});
