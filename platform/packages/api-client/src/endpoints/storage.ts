import type { ApiClient } from '../core/http-client';

export const storageApi = (api: ApiClient) => ({
  presign: (body: {
    purpose: 'driver_doc' | 'poi_import' | 'avatar';
    contentType: string;
    fileName: string;
  }) => api.client.post('/api/storage/presign', body).then((r) => r.data),
});
