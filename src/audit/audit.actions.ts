export const AuditAction = {
  // Trips
  TripCreate: 'trip.create',
  TripPublish: 'trip.publish',
  TripStart: 'trip.start',
  TripComplete: 'trip.complete',
  TripCancel: 'trip.cancel',

  // Requests / bookings
  RequestCreate: 'request.create',
  RequestAccept: 'request.accept',
  RequestReject: 'request.reject',

  // Admin / driver
  DriverVerify: 'driver.verify',
  DriverReject: 'driver.reject',
  UserRoleChange: 'user.role.change',
  UserBan: 'user.ban',
  UserUnban: 'user.unban',
  PaymentMarkPaid: 'payment.mark.paid',
  PaymentReconcileTimeout: 'payment.reconcile.timeout',
  TicketStatusChange: 'ticket.status.change',
  PoiReportApprove: 'poi.report.approve',
  PoiReportReject: 'poi.report.reject',

  OfferCreate: 'offer.create',
  OfferAccept: 'offer.accept',
  OfferReject: 'offer.reject',
  OfferCancel: 'offer.cancel',
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];

export type AuditSeverity = 'info' | 'warning' | 'critical';
