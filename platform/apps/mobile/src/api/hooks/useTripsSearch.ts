import { useMemo } from 'react';
import { api } from '../client';
import { unwrapItems } from '../mappers/dto';
import { useQuery } from './useQuery';

export type TripsSearchParams = {
  fromCityId?: string;
  toCityId?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  seats?: number;
  page?: number;
  pageSize?: number;
};

export function useTripsSearch(params: TripsSearchParams) {
  const mappedParams = useMemo(() => {
    const date = params.date?.trim();
    return {
      ...params,
      ...(date ? { dateFrom: date, dateTo: date } : {}),
      date: undefined,
    } as Record<string, unknown>;
  }, [params]);

  const query = useQuery(
    async () => {
      const result = await api.trips.search(mappedParams);
      return unwrapItems<any>(result);
    },
    [
      params.fromCityId ?? '',
      params.toCityId ?? '',
      params.date ?? '',
      params.dateFrom ?? '',
      params.dateTo ?? '',
      String(params.seats ?? ''),
    ],
  );

  const items = useMemo(() => query.data ?? [], [query.data]);

  return { ...query, items };
}
