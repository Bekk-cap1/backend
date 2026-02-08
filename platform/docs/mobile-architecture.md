# Mobile Architecture

## Stack

- Expo React Native
- React Navigation (native stack + bottom tabs)
- Shared axios API client with refresh queue
- AsyncStorage token adapter

## Role handling

- PASSENGER: passenger tabs and flows
- DRIVER: driver tabs and flows
- ADMIN/MODERATOR: blocked with prompt to use admin web

## Functional coverage

- Passenger: trip search, request creation, negotiation actions, bookings, profile
- Driver: dashboard, trip lifecycle actions, bookings, profile
- Geo/routing/POI: driver location update, passenger ETA/location polling, POI checks and alerts
