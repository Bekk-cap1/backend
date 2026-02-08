export const appLinking = {
  prefixes: ['intercity://'],
  config: {
    screens: {
      AuthStack: {
        screens: {
          Login: 'login',
          Register: 'register',
        },
      },
      PassengerTabs: {
        screens: {
          Home: 'home',
          MyTrips: 'my-trips',
          Alerts: 'alerts',
          Support: 'support',
          Profile: 'profile',
        },
      },
      DriverTabs: {
        screens: {
          Home: 'driver/home',
          Trips: 'driver/trips',
          Requests: 'driver/requests',
          Alerts: 'driver/alerts',
          Profile: 'driver/profile',
        },
      },
      TripDetails: 'trip/:tripId',
      BookingDetails: 'booking/:bookingId',
      Payments: 'payments/:bookingId',
      PassengerNegotiation: 'request/:requestId/negotiation',
      DriverNegotiation: 'driver/request/:requestId/negotiation',
      ActiveTrip: 'driver/trip/:tripId/active',
    },
  },
};
