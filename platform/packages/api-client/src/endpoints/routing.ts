import type { ApiClient } from '../core/http-client';

export const routingApi = (api: ApiClient) => ({
  route: (params: { fromLat: number; fromLon: number; toLat: number; toLon: number }) =>
    api.request('get', '/api/routing/route', { params }),
  routeV1: (params: { fromLat: number; fromLon: number; toLat: number; toLon: number }) =>
    api.request('get', '/api/v1/routing/route', { params }),
  tripRoute: (tripId: string) =>
    api.client.get(`/api/routing/trip/${tripId}`).then((response) => response.data),
  tripRouteV1: (tripId: string) =>
    api.client.get(`/api/v1/routing/trip/${tripId}`).then((response) => response.data),
  tripEta: (tripId: string) =>
    api.client.get(`/api/routing/trip/${tripId}/eta`).then((response) => response.data),
  tripEtaV1: (tripId: string) =>
    api.client.get(`/api/v1/routing/trip/${tripId}/eta`).then((response) => response.data),
});

