import { useMemo } from 'react';
import { api } from '../client';
import { unwrapItems } from '../mappers/dto';
import { useQuery } from './useQuery';

export type TripsSearchParams = {
  fromCityId?: string;
  toCityId?: string;
  date?: string;
  seats?: number;
  page?: number;
  pageSize?: number;
};

export function useTripsSearch(params: TripsSearchParams) {
  const query = useQuery(
    async () => {
      const result = await api.trips.search(params as Record<string, unknown>);
      return unwrapItems<any>(result);
    },
    [params.fromCityId ?? '', params.toCityId ?? '', params.date ?? '', String(params.seats ?? '')],
  );

  const items = useMemo(() => query.data ?? [], [query.data]);

  return { ...query, items };
}
