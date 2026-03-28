import type { ApiClient } from '../core/http-client';

export const geoApi = (api: ApiClient) => ({
  updateDriverLocation: (tripId: string, body: { lat: number; lon: number; speedKmh?: number; headingDeg?: number }) =>
    api.client.patch(`/api/geo/trips/${tripId}/location`, body).then((r) => r.data),
  getDriverLocation: (tripId: string) =>
    api.client.get(`/api/geo/trips/${tripId}/location`).then((r) => r.data),
  placesAutocomplete: (params: { q: string; limit?: number; lat?: number; lon?: number }) =>
    api.client.get('/api/geo/autocomplete', { params }).then((r) => r.data),
  placesReverse: (params: { lat: number; lon: number }) =>
    api.client.get('/api/geo/reverse', { params }).then((r) => r.data),
  getTripEta: (tripId: string) =>
    api.client.get(`/api/routing/trip/${tripId}/eta`).then((r) => r.data),
  getTripEtaAlias: (tripId: string) =>
    api.client.get(`/api/geo/trip/${tripId}/eta`).then((r) => r.data),
});
