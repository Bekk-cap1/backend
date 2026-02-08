import type { ApiClient } from '../core/http-client';

export const cancellationsApi = (api: ApiClient) => ({
  quote: (bookingId: string) =>
    api.client.get(`/api/cancellations/bookings/${bookingId}/quote`).then((response) => response.data),
  apply: (bookingId: string) =>
    api.client.post(`/api/cancellations/bookings/${bookingId}/apply`).then((response) => response.data),
});

