import { useMemo } from 'react';
import { useQuery } from './useQuery';
import { api } from '../client';
import { unwrapItems } from '../mappers/dto';

export function useRadars(polyline?: string, from?: { lat: number; lon: number }) {
  const route = useQuery(
    async () => {
      if (!polyline) return [] as any[];
      const result = await api.poi.alongRoute({ polyline, bufferMeters: 1200 });
      return unwrapItems<any>(result).filter((poi) => String(poi.type ?? '').includes('speed') || String(poi.type ?? '').includes('hazard'));
    },
    [polyline ?? ''],
  );

  const nearby = useQuery(
    async () => {
      if (!from) return [] as any[];
      const result = await api.poi.listNearby({ lat: from.lat, lon: from.lon, radiusMeters: 1500 });
      return unwrapItems<any>(result);
    },
    [from?.lat ?? '', from?.lon ?? ''],
  );

  const items = useMemo(() => {
    const map = new Map<string, any>();
    for (const item of [...(route.data ?? []), ...(nearby.data ?? [])]) {
      map.set(String(item.id ?? `${item.lat}:${item.lon}:${item.type}`), item);
    }
    return Array.from(map.values());
  }, [nearby.data, route.data]);

  return { route, nearby, items };
}
