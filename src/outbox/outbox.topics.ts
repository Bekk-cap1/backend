export const OutboxTopic = {
  // Trips
  TripCreated: 'trip.created',
  TripPublished: 'trip.published',
  TripStarted: 'trip.started',
  TripCompleted: 'trip.completed',
  TripCanceled: 'trip.canceled',

  // Requests
  RequestCreated: 'request.created',
  RequestAccepted: 'request.accepted',
  RequestRejected: 'request.rejected',
  RequestCanceled: 'request.canceled',

  // Drivers / Users
  DriverVerified: 'driver.verified',
  DriverRejected: 'driver.rejected',
  UserRoleChanged: 'user.role.changed',

  OfferCreated: 'offer.created',
  OfferAccepted: 'offer.accepted',
  OfferRejected: 'offer.rejected',
  OfferCanceled: 'offer.canceled',

  // Payments
  PaymentPaid: 'payment.paid',
  PaymentMarkedPaid: 'payment.marked.paid',

  // POI / Radar
  PoiRadarAlert: 'poi.radar.alert',
  PoiReportCreated: 'poi.report.created',
  PoiReportApproved: 'poi.report.approved',
  PoiReportRejected: 'poi.report.rejected',

  // Support
  SupportTicketCreated: 'support.ticket.created',

  // Admin
  UserBanned: 'user.banned',
  UserUnbanned: 'user.unbanned',
} as const;

export type OutboxTopicType = (typeof OutboxTopic)[keyof typeof OutboxTopic];
