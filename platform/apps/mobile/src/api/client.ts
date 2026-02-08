import { ApiClient, authApi, bookingsApi, cancellationsApi, citiesApi, driversApi, geoApi, notificationsApi, offersApi, paymentsApi, poiApi, requestsApi, routingApi, ticketsApi, tripsApi, vehiclesApi } from '@platform/api-client';
import { appConfig } from '../core/config';
import { mobileTokenStore } from './tokenStore';

let unauthorizedHandler: (() => void) | null = null;

export function setApiUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export const apiClient = new ApiClient({
  baseURL: appConfig.apiBaseUrl,
  tokenStore: mobileTokenStore,
  onUnauthorized: async () => {
    unauthorizedHandler?.();
  },
});

export const api = {
  auth: authApi(apiClient),
  bookings: bookingsApi(apiClient),
  cancellations: cancellationsApi(apiClient),
  cities: citiesApi(apiClient),
  drivers: driversApi(apiClient),
  geo: geoApi(apiClient),
  notifications: notificationsApi(apiClient),
  offers: offersApi(apiClient),
  payments: paymentsApi(apiClient),
  poi: poiApi(apiClient),
  requests: requestsApi(apiClient),
  routing: routingApi(apiClient),
  tickets: ticketsApi(apiClient),
  trips: tripsApi(apiClient),
  vehicles: vehiclesApi(apiClient),
};
