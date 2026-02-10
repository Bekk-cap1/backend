import type { ApiClient } from '../core/http-client';

export const adminApi = (api: ApiClient) => ({
  listUsers: (params?: Record<string, unknown>) =>
    api.request('get', '/api/v1/admin/users', { params }),
  getUser: (userId: string) =>
    api.client.get(`/api/v1/admin/users/${userId}`).then((r) => r.data),
  createUser: (body: { phone: string; password: string; role?: string }) =>
    api.client.post('/api/v1/admin/users', body).then((r) => r.data),
  updateUser: (
    userId: string,
    body: { phone?: string; role?: string; reason: string },
    confirmToken?: string,
  ) =>
    api.client
      .patch(`/api/v1/admin/users/${userId}`, body, {
        headers: confirmToken ? { 'X-Admin-Confirm': confirmToken } : undefined,
      })
      .then((r) => r.data),
  deleteUser: (userId: string, body: { reason: string }, confirmToken: string) =>
    api.client
      .delete(`/api/v1/admin/users/${userId}`, {
        data: body,
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  changeUserRole: (
    userId: string,
    body: {
      role:
        | 'admin'
        | 'driver'
        | 'passenger'
        | 'moderator'
        | 'finance'
        | 'support'
        | 'ops'
        | 'superadmin';
      reason?: string;
    },
    confirmToken?: string,
  ) =>
    api.client
      .patch(`/api/v1/admin/users/${userId}/role`, body, {
        headers: confirmToken ? { 'X-Admin-Confirm': confirmToken } : undefined,
      })
      .then((r) => r.data),
  banUser: (userId: string, body: { reason?: string }) =>
    api.client.post(`/api/v1/admin/users/${userId}/ban`, body).then((r) => r.data),
  unbanUser: (userId: string) =>
    api.client.post(`/api/v1/admin/users/${userId}/unban`).then((r) => r.data),
  reauth: (body: { password: string }) =>
    api.client.post('/api/v1/admin/reauth', body).then((r) => r.data),
  impersonate: (
    body: { userId: string; reason: string },
    confirmToken: string,
  ) =>
    api.client
      .post('/api/v1/admin/impersonate', body, {
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  stopImpersonation: (body: { reason: string }) =>
    api.client.post('/api/v1/admin/impersonate/stop', body).then((r) => r.data),
  getSystemSettings: () =>
    api.client.get('/api/v1/admin/system').then((r) => r.data),
  resetPassword: (
    userId: string,
    body: { reason: string; newPassword?: string },
    confirmToken: string,
  ) =>
    api.client
      .post(`/api/v1/admin/users/${userId}/reset-password`, body, {
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  logoutAllSessions: (userId: string, body: { reason: string }, confirmToken: string) =>
    api.client
      .post(`/api/v1/admin/users/${userId}/logout-all`, body, {
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  listDrivers: (params?: Record<string, unknown>) =>
    api.request('get', '/api/v1/admin/drivers', { params }),
  listDriverApplications: (params?: Record<string, unknown>) =>
    api.client.get('/api/v1/admin/driver-applications', { params }).then((r) => r.data),
  getDriverApplication: (userId: string) =>
    api.client.get(`/api/v1/admin/driver-applications/${userId}`).then((r) => r.data),
  updateDriver: (
    userId: string,
    body: {
      fullName?: string;
      licenseNo?: string;
      passportNo?: string;
      status?: string;
      rejectionReason?: string;
      reason: string;
    },
    confirmToken: string,
  ) =>
    api.client
      .patch(`/api/v1/admin/drivers/${userId}`, body, {
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  verifyDriver: (userId: string, body: { reason: string }, confirmToken: string) =>
    api.client
      .post(`/api/v1/admin/drivers/${userId}/verify`, body, {
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  rejectDriver: (userId: string, body: { reason: string }, confirmToken: string) =>
    api.client
      .post(`/api/v1/admin/drivers/${userId}/reject`, body, {
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  listTrips: (params?: Record<string, unknown>) =>
    api.client.get('/api/v1/admin/trips', { params }).then((r) => r.data),
  getTrip: (tripId: string) =>
    api.client.get(`/api/v1/admin/trips/${tripId}`).then((r) => r.data),
  updateTrip: (
    tripId: string,
    body: {
      reason: string;
      price?: number;
      seatsTotal?: number;
      departureAt?: string;
      fromCityId?: string;
      toCityId?: string;
      vehicleId?: string;
      clearVehicle?: boolean;
    },
    confirmToken: string,
  ) =>
    api.client
      .patch(`/api/v1/admin/trips/${tripId}`, body, {
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  forceTransitionTrip: (
    tripId: string,
    action: 'publish' | 'start' | 'complete' | 'cancel',
    body: { reason: string },
    confirmToken: string,
  ) =>
    api.client
      .post(`/api/v1/admin/trips/${tripId}/${action}`, body, {
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  listRequests: (params?: Record<string, unknown>) =>
    api.client.get('/api/v1/admin/requests', { params }).then((r) => r.data),
  getRequest: (requestId: string) =>
    api.client.get(`/api/v1/admin/requests/${requestId}`).then((r) => r.data),
  cancelRequest: (requestId: string, body: { reason: string }, confirmToken: string) =>
    api.client
      .post(`/api/v1/admin/requests/${requestId}/cancel`, body, {
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  listOffers: (params?: Record<string, unknown>) =>
    api.client.get('/api/v1/admin/offers', { params }).then((r) => r.data),
  getOffer: (offerId: string) =>
    api.client.get(`/api/v1/admin/offers/${offerId}`).then((r) => r.data),
  forceOfferAction: (
    offerId: string,
    action: 'accept' | 'reject' | 'cancel',
    body: { reason: string },
    confirmToken: string,
  ) =>
    api.client
      .post(`/api/v1/admin/offers/${offerId}/${action}`, body, {
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  listBookings: (params?: Record<string, unknown>) =>
    api.client.get('/api/v1/admin/bookings', { params }).then((r) => r.data),
  getBooking: (bookingId: string) =>
    api.client.get(`/api/v1/admin/bookings/${bookingId}`).then((r) => r.data),
  updateBooking: (
    bookingId: string,
    body: {
      seats?: number;
      price?: number;
      currency?: string;
      reason: string;
    },
    confirmToken: string,
  ) =>
    api.client
      .patch(`/api/v1/admin/bookings/${bookingId}`, body, {
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  forceCancelBooking: (bookingId: string, body: { reason: string }, confirmToken: string) =>
    api.client
      .post(`/api/v1/admin/bookings/${bookingId}/cancel`, body, {
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  forceCompleteBooking: (bookingId: string, body: { reason: string }, confirmToken: string) =>
    api.client
      .post(`/api/v1/admin/bookings/${bookingId}/complete`, body, {
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  listVehicles: (params?: Record<string, unknown>) =>
    api.client.get('/api/v1/admin/vehicles', { params }).then((r) => r.data),
  getVehicle: (vehicleId: string) =>
    api.client.get(`/api/v1/admin/vehicles/${vehicleId}`).then((r) => r.data),
  updateVehicle: (
    vehicleId: string,
    body: {
      make?: string;
      model?: string;
      plateNo?: string;
      color?: string;
      seats?: number;
      reason: string;
    },
    confirmToken: string,
  ) =>
    api.client
      .patch(`/api/v1/admin/vehicles/${vehicleId}`, body, {
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  deleteVehicle: (vehicleId: string, body: { reason: string }, confirmToken: string) =>
    api.client
      .delete(`/api/v1/admin/vehicles/${vehicleId}`, {
        data: body,
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  listRadars: (params?: Record<string, unknown>) =>
    api.client.get('/api/v1/admin/radars', { params }).then((r) => r.data),
  exportRadars: () =>
    api.client.get('/api/v1/admin/radars/export').then((r) => r.data),
  createRadar: (
    body: {
      name: string;
      lat: number;
      lon: number;
      reason: string;
      description?: string;
      radiusMeters?: number;
      isActive?: boolean;
      type?: string;
    },
    confirmToken: string,
  ) =>
    api.client
      .post('/api/v1/admin/radars', body, {
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  updateRadar: (
    radarId: string,
    body: {
      reason: string;
      name?: string;
      lat?: number;
      lon?: number;
      description?: string;
      radiusMeters?: number;
      isActive?: boolean;
      type?: string;
    },
    confirmToken: string,
  ) =>
    api.client
      .patch(`/api/v1/admin/radars/${radarId}`, body, {
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  deleteRadar: (radarId: string, body: { reason: string }, confirmToken: string) =>
    api.client
      .delete(`/api/v1/admin/radars/${radarId}`, {
        data: body,
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  importRadars: (
    body: { items: Array<Record<string, unknown>>; reason: string },
    confirmToken: string,
  ) =>
    api.client
      .post('/api/v1/admin/radars/import', body, {
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  broadcastNotification: (
    body: {
      message: string;
      reason: string;
      type?: string;
      title?: string;
      payload?: Record<string, unknown>;
    },
    confirmToken: string,
  ) =>
    api.client
      .post('/api/v1/admin/notifications/broadcast', body, {
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  notifyUser: (
    userId: string,
    body: {
      message: string;
      reason: string;
      type?: string;
      title?: string;
      payload?: Record<string, unknown>;
    },
    confirmToken: string,
  ) =>
    api.client
      .post(`/api/v1/admin/notifications/user/${userId}`, body, {
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  notifySegment: (
    body: {
      message: string;
      reason: string;
      roles?: string[];
      isBanned?: boolean;
      driverStatus?: string;
      type?: string;
      title?: string;
      payload?: Record<string, unknown>;
    },
    confirmToken: string,
  ) =>
    api.client
      .post('/api/v1/admin/notifications/segment', body, {
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  listSessions: (params?: Record<string, unknown>) =>
    api.client.get('/api/v1/admin/sessions', { params }).then((r) => r.data),
  listDevices: (params?: Record<string, unknown>) =>
    api.client.get('/api/v1/admin/devices', { params }).then((r) => r.data),
  listPaymentAttempts: (params?: Record<string, unknown>) =>
    api.client.get('/api/v1/admin/payments/attempts', { params }).then((r) => r.data),
  listPaymentEvents: (params?: Record<string, unknown>) =>
    api.client.get('/api/v1/admin/payments/events', { params }).then((r) => r.data),
  listPaymentLedger: (params?: Record<string, unknown>) =>
    api.client.get('/api/v1/admin/payments/ledger', { params }).then((r) => r.data),
  listFareQuotes: (params?: Record<string, unknown>) =>
    api.client.get('/api/v1/admin/fare-quotes', { params }).then((r) => r.data),
  listOtpCodes: (params?: Record<string, unknown>) =>
    api.client.get('/api/v1/admin/otp-codes', { params }).then((r) => r.data),
  listOutboxEvents: (params?: Record<string, unknown>) =>
    api.client.get('/api/v1/admin/outbox', { params }).then((r) => r.data),
  retryOutboxEvent: (
    eventId: string,
    body: { reason: string },
    confirmToken: string,
  ) =>
    api.client
      .post(`/api/v1/admin/outbox/${eventId}/retry`, body, {
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  listGeoSamples: (params?: Record<string, unknown>) =>
    api.client.get('/api/v1/admin/geo/samples', { params }).then((r) => r.data),
  listPayments: (params?: Record<string, unknown>) =>
    api.request('get', '/api/v1/admin/payments', { params }),
  listTickets: (params?: Record<string, unknown>) =>
    api.request('get', '/api/v1/admin/tickets', { params }),
  getTicket: (ticketId: string) =>
    api.client.get(`/api/v1/admin/tickets/${ticketId}`).then((r) => r.data),
  updateTicketStatus: (ticketId: string, body: { status: string }) =>
    api.client.patch(`/api/v1/admin/tickets/${ticketId}/status`, body).then((r) => r.data),
  commentTicket: (
    ticketId: string,
    body: { comment: string; reason: string },
    confirmToken: string,
  ) =>
    api.client
      .post(`/api/v1/admin/tickets/${ticketId}/comment`, body, {
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  assignTicket: (
    ticketId: string,
    body: { adminId: string; reason: string },
    confirmToken: string,
  ) =>
    api.client
      .post(`/api/v1/admin/tickets/${ticketId}/assign`, body, {
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  escalateTicket: (
    ticketId: string,
    body: { reason: string },
    confirmToken: string,
  ) =>
    api.client
      .post(`/api/v1/admin/tickets/${ticketId}/escalate`, body, {
        headers: { 'X-Admin-Confirm': confirmToken },
      })
      .then((r) => r.data),
  listAudit: (params?: Record<string, unknown>) =>
    api.client.get('/api/v1/admin/audit', { params }).then((r) => r.data),
});
