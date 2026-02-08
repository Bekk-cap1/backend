import type { ApiClient } from '../core/http-client';

export const adminApi = (api: ApiClient) => ({
  listUsers: (params?: Record<string, unknown>) =>
    api.request('get', '/api/v1/admin/users', { params }),
  changeUserRole: (userId: string, body: { role: 'admin' | 'driver' | 'passenger' | 'moderator' }) =>
    api.client.patch(`/api/v1/admin/users/${userId}/role`, body).then((r) => r.data),
  banUser: (userId: string, body: { reason?: string }) =>
    api.client.post(`/api/v1/admin/users/${userId}/ban`, body).then((r) => r.data),
  unbanUser: (userId: string) =>
    api.client.post(`/api/v1/admin/users/${userId}/unban`).then((r) => r.data),
  listDrivers: (params?: Record<string, unknown>) =>
    api.request('get', '/api/v1/admin/drivers', { params }),
  verifyDriver: (userId: string) =>
    api.client.post(`/api/v1/admin/drivers/${userId}/verify`).then((r) => r.data),
  rejectDriver: (userId: string, body: { reason?: string }) =>
    api.client.post(`/api/v1/admin/drivers/${userId}/reject`, body).then((r) => r.data),
  listPayments: (params?: Record<string, unknown>) =>
    api.request('get', '/api/v1/admin/payments', { params }),
  listTickets: (params?: Record<string, unknown>) =>
    api.request('get', '/api/v1/admin/tickets', { params }),
  updateTicketStatus: (ticketId: string, body: { status: string }) =>
    api.client.patch(`/api/v1/admin/tickets/${ticketId}/status`, body).then((r) => r.data),
  listAudit: (params?: Record<string, unknown>) =>
    api.client.get('/api/admin/audit', { params }).then((r) => r.data),
});
