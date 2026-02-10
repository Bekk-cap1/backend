import { useQuery } from './useQuery';
import { api } from '../client';
import { unwrapItems, unwrapPayload } from '../mappers/dto';

export function useTripDetails(tripId: string) {
  const trip = useQuery(async () => unwrapPayload<any>(await api.trips.getById(tripId)), [tripId]);
  const route = useQuery(async () => unwrapPayload<any>(await api.routing.tripRoute(tripId)), [tripId]);
  const eta = useQuery(async () => unwrapPayload<any>(await api.routing.tripEta(tripId)), [tripId]);
  const nearbyPoi = useQuery(
    async () => {
      const from = trip.data?.fromCity;
      if (!from?.lat || !from?.lon) return [] as any[];
      const result = await api.poi.listNearby({ lat: Number(from.lat), lon: Number(from.lon), radiusMeters: 2000 });
      return unwrapItems<any>(result);
    },
    [tripId, trip.data?.fromCity?.lat ?? '', trip.data?.fromCity?.lon ?? ''],
  );

  return { trip, route, eta, nearbyPoi };
}
