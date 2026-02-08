# Mobile QA Checklist

## Login and role routing

- [ ] passenger login opens passenger tabs
- [ ] driver login opens driver tabs
- [ ] admin login shows blocked screen and logout action

## Passenger

- [ ] trips search loads and request creation works
- [ ] requests list loads and cancel/accept offer actions work
- [ ] bookings show and ETA polling updates
- [ ] Google Maps link opens

## Driver

- [ ] dashboard loads bookings
- [ ] trip create/publish/start/complete actions callable
- [ ] location update endpoint callable
- [ ] route POI lookup works

## Stability

- [ ] token refresh queue handles concurrent 401 responses
- [ ] logout clears persisted tokens
