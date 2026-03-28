import type { ApiClient } from '../core/http-client';

export const accountsApi = (api: ApiClient) => ({
  me: () => api.client.get('/api/accounts/me').then((r) => r.data),
  updateProfile: (body: { fullName?: string; avatarUrl?: string; language?: string }) =>
    api.client.patch('/api/accounts/profile', body).then((r) => r.data),
});

