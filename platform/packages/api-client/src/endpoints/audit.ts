import type { ApiClient } from '../core/http-client';

export const auditApi = (api: ApiClient) => ({
  list: (params?: Record<string, unknown>) =>
    api.client.get('/api/admin/audit', { params }).then((response) => response.data),
});

