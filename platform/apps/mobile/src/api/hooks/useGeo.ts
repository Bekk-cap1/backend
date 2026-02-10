import { useQuery } from './useQuery';
import { useMutation } from './useMutation';
import { api } from '../client';
import { unwrapPayload } from '../mappers/dto';

type DriverLocationPayload = {
  lat: number;
  lon: number;
  speedKmh?: number;
  headingDeg?: number;
};

export function useGeo(tripId: string) {
  const location = useQuery(async () => unwrapPayload<any>(await api.geo.getDriverLocation(tripId)), [tripId]);
  const eta = useQuery(async () => unwrapPayload<any>(await api.geo.getTripEta(tripId)), [tripId]);

  const updateDriverLocation = useMutation(async (payload: DriverLocationPayload) =>
    api.geo.updateDriverLocation(tripId, payload),
  );

  return { location, eta, updateDriverLocation };
}
