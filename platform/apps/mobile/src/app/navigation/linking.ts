export const appLinking = {
  prefixes: ['intercity://', 'http://localhost:8081', 'http://localhost:19006'],
  config: {
    screens: {
      Bootstrapping: 'boot',
      AdminBlocked: 'admin-blocked',
      AuthStack: {
        screens: {
          Welcome: '',
          Login: 'login',
          Register: 'register',
          Otp: 'otp',
          ResetPassword: 'reset-password',
        },
      },
      PassengerTabs: {
        path: 'passenger',
        screens: {
          Home: 'home',
          MyTrips: 'my-trips',
          Alerts: 'alerts',
          Support: 'support',
          Profile: 'profile',
        },
      },
      DriverTabs: {
        path: 'driver',
        screens: {
          Home: 'dispatch',
          Requests: 'requests',
          Trips: 'trips',
          Alerts: 'alerts',
          Profile: 'profile',
        },
      },
      SearchResults: 'passenger/search-results',
      TripDetails: 'passenger/trips/:tripId',
      CreateRequest: 'passenger/trips/:tripId/request',
      LocationPicker: 'passenger/location-picker',
      PassengerNegotiation: 'passenger/requests/:requestId/negotiation',
      BookingDetails: 'passenger/bookings/:bookingId',
      Payments: 'passenger/bookings/:bookingId/payments',
      LiveTrip: 'passenger/live/:bookingId',
      DriverVerification: 'driver/verification',
      Vehicles: 'driver/vehicles',
      CreateTrip: 'driver/create-trip',
      DriverNegotiation: 'driver/requests/:requestId/negotiation',
      ActiveTrip: 'driver/trips/:tripId/active',
      DriverBookings: 'driver/bookings',
      DriverSupport: 'driver/support',
    },
  },
};

