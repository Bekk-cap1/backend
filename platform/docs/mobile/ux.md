# Intercity Pulse Mobile UX

## Passenger Journey
1. **Explore (Home tab)**: pick `From/To` city, date, seats, then run search.
2. **Trip list**: compare options by departure time, seats, and price.
3. **Trip details**: inspect route map + POI/radars and continue to request.
4. **Create request**:
   - choose seats (Level 1 picker),
   - set pickup/dropoff with map or address search (Location Picker),
   - submit request (offline queue fallback enabled).
5. **Negotiation**: turn-based offers, accept/reject/cancel actions.
6. **Booking + payment**: open booking details, create payment intent, track status.
7. **Live trip**: map with driver location + ETA and open-in-maps fallback.
8. **Support**: create ticket, view ticket list, open ticket details.

## Driver Journey
1. **Dispatch (Home tab)**: verification status + today summary + quick actions.
2. **Driver verification**: submit profile and document links (`draft -> pending -> verified/rejected`).
3. **Trips tab**: create trip draft, publish, open active trip.
4. **Requests tab**: inspect passenger requests and negotiation sessions.
5. **Active trip**: start/complete trip and stream location.
6. **Support**: same ticket flow with driver-focused entry point.

## IA Differences (Passenger vs Driver)
- **Passenger tabs**: `Explore / My Trips / Alerts / Support / Profile`
- **Driver tabs**: `Dispatch / Requests / Trips / Alerts / Profile`
- Visual accents differ:
  - passenger uses primary route-search emphasis,
  - driver uses dispatch/ops emphasis with quick action cards.

