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

} as const;

export type OutboxTopicType = (typeof OutboxTopic)[keyof typeof OutboxTopic];
