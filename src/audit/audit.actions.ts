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
  RequestCancel: 'request.cancel',
  RequestForceCancel: 'request.force.cancel',

  // Admin / driver
  DriverVerify: 'driver.verify',
  DriverReject: 'driver.reject',
  DriverSubmit: 'driver.submit',
  UserRoleChange: 'user.role.change',
  UserCreate: 'user.create',
  UserUpdate: 'user.update',
  UserDelete: 'user.delete',
  UserResetPassword: 'user.password.reset',
  UserLogoutAll: 'user.logout.all',
  UserBan: 'user.ban',
  UserUnban: 'user.unban',
  ImpersonationStart: 'impersonation.start',
  ImpersonationStop: 'impersonation.stop',
  AdminReauth: 'admin.reauth',
  PaymentMarkPaid: 'payment.mark.paid',
  PaymentReconcileTimeout: 'payment.reconcile.timeout',
  TicketStatusChange: 'ticket.status.change',
  TicketAssign: 'ticket.assign',
  TicketEscalate: 'ticket.escalate',
  TicketComment: 'ticket.comment',
  PoiReportApprove: 'poi.report.approve',
  PoiReportReject: 'poi.report.reject',
  RadarCreate: 'radar.create',
  RadarUpdate: 'radar.update',
  RadarDelete: 'radar.delete',
  NotificationBroadcast: 'notification.broadcast',
  NotificationSendUser: 'notification.send.user',
  NotificationSendSegment: 'notification.send.segment',
  TripForceUpdate: 'trip.force.update',
  TripForceTransition: 'trip.force.transition',
  BookingForceUpdate: 'booking.force.update',
  BookingForceCancel: 'booking.force.cancel',
  BookingForceComplete: 'booking.force.complete',
  OfferForceAction: 'offer.force.action',
  VehicleForceUpdate: 'vehicle.force.update',
  VehicleForceDelete: 'vehicle.force.delete',
  OutboxRetry: 'outbox.retry',

  OfferCreate: 'offer.create',
  OfferAccept: 'offer.accept',
  OfferReject: 'offer.reject',
  OfferCancel: 'offer.cancel',
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];

export type AuditSeverity = 'info' | 'warning' | 'critical';
