import type { ApiClient } from '../core/http-client';

export const authApi = (api: ApiClient) => ({
  register: (body: { phone: string; password: string }) =>
    api.request('post', '/api/auth/register', { body: body as never }),
  login: (body: { phone: string; password: string }) =>
    api.request('post', '/api/auth/login', { body: body as never }),
  webLogin: (body: { phone: string; password: string }) =>
    api.request('post', '/api/auth/web/login', { body: body as never }),
  refresh: (body: { refreshToken: string }) =>
    api.request('post', '/api/auth/refresh', { body: body as never }),
  webRefresh: () => api.request('post', '/api/auth/web/refresh', { body: {} as never }),
  me: () => api.request('get', '/api/auth/me'),
  logout: (body: { refreshToken: string }) =>
    api.request('post', '/api/auth/logout', { body: body as never }),
  webLogout: () => api.request('post', '/api/auth/web/logout', { body: {} as never }),
  sendOtp: (body: { phone: string }) =>
    api.request('post', '/api/auth/otp/send', { body: body as never }),
  verifyOtp: (body: { phone: string; code: string; purpose?: string }) =>
    api.request('post', '/api/auth/otp/verify', { body: body as never }),
  requestPasswordReset: (body: { phone: string }) =>
    api.request('post', '/api/auth/password/reset/request', { body: body as never }),
  confirmPasswordReset: (body: { phone: string; code: string; newPassword: string }) =>
    api.request('post', '/api/auth/password/reset/confirm', { body: body as never }),
  sessions: () => api.request('get', '/api/auth/sessions'),
  revokeSession: (id: string) => api.client.delete(`/api/auth/sessions/${id}`).then((r) => r.data),
});
