import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { MapView } from '../../ui/components/Map/MapView';
import { RoutePolyline } from '../../ui/components/Map/RoutePolyline';
import { PoiLayer } from '../../ui/components/Map/PoiLayer';
import { RadarLayer } from '../../ui/components/Map/RadarLayer';
import { NearbyAlertBanner } from '../../ui/components/Map/NearbyAlertBanner';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapPayload, unwrapItems } from '../../api/mappers/dto';
import { EmptyState } from '../../ui/components/EmptyState';
import { decodeRoutePolyline } from '../../core/location/polyline';
import { getCached, setCached } from '../../core/cache/simple-cache';
import type { MapMarker } from '../../ui/components/Map/types';

type RouteData = {
  polyline?: string;
  distanceMeters?: number;
  durationSeconds?: number;
  bbox?: [number, number, number, number];
};

function mapPoiToMarker(items: any[]): MapMarker[] {
  return items
    .filter((item) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon)))
    .map((item, idx) => ({
      id: String(item.id ?? `poi-${idx}`),
      lat: Number(item.lat),
      lon: Number(item.lon),
      kind: String(item.type ?? '').includes('speed') || String(item.type ?? '').includes('hazard') ? 'radar' : 'poi',
      title: item.name ?? item.type ?? 'POI',
      description: item.description ?? undefined,
    }));
}

export function TripDetailsScreen({ route, navigation }: { route: any; navigation: any }) {
  const tripId = String(route.params?.tripId ?? '');
  const [showPoi, setShowPoi] = useState(true);
  const [showRadars, setShowRadars] = useState(true);

  const tripQuery = useQuery(async () => unwrapPayload<any>(await api.trips.getById(tripId)), [tripId]);
  const routeQuery = useQuery(async () => unwrapPayload<RouteData>(await api.routing.tripRoute(tripId)), [tripId]);

  const locationQuery = useQuery(async () => unwrapPayload<any>(await api.geo.getDriverLocation(tripId)), [tripId]);
  const etaQuery = useQuery(async () => unwrapPayload<any>(await api.routing.tripEta(tripId)), [tripId]);

  useEffect(() => {
    const timer = setInterval(() => {
      locationQuery.reload().catch(() => undefined);
      etaQuery.reload().catch(() => undefined);
    }, 3500);

    return () => clearInterval(timer);
  }, [etaQuery, locationQuery]);

  const poiQuery = useQuery(async () => {
    const routePolyline = routeQuery.data?.polyline;
    const cacheKey = `poi-route:${tripId}:${routePolyline ?? 'none'}`;
    const cached = await getCached<any[]>(cacheKey);
    if (cached) return cached;

    const routePoints = routePolyline
      ? unwrapItems<any>(await api.poi.alongRoute({ polyline: routePolyline, bufferMeters: 1200 }))
      : [];

    if (routePoints.length) {
      await setCached(cacheKey, routePoints, 120_000);
      return routePoints;
    }

    const fromCity = tripQuery.data?.fromCity;
    if (fromCity?.lat && fromCity?.lon) {
      const nearby = unwrapItems<any>(
        await api.poi.listNearby({ lat: Number(fromCity.lat), lon: Number(fromCity.lon), radiusMeters: 2000 }),
      );
      await setCached(cacheKey, nearby, 120_000);
      return nearby;
    }

    return [];
  }, [tripId, routeQuery.data?.polyline ?? '', tripQuery.data?.fromCity?.lat ?? '', tripQuery.data?.fromCity?.lon ?? '']);

  const routeCoords = useMemo(() => decodeRoutePolyline(routeQuery.data?.polyline), [routeQuery.data?.polyline]);

  const driver = useMemo(() => {
    const point = locationQuery.data?.location ?? locationQuery.data;
    if (!point || !Number.isFinite(Number(point.lat)) || !Number.isFinite(Number(point.lon))) {
      return null;
    }
    return { lat: Number(point.lat), lon: Number(point.lon) };
  }, [locationQuery.data]);

  const allMarkers = useMemo(() => mapPoiToMarker(poiQuery.data ?? []), [poiQuery.data]);
  const poiMarkers = useMemo(() => allMarkers.filter((item) => item.kind === 'poi'), [allMarkers]);
  const radarMarkers = useMemo(() => allMarkers.filter((item) => item.kind === 'radar'), [allMarkers]);

  return (
    <Screen>
      <Topbar title="Trip details" right={<Button title="Back" variant="ghost" onPress={() => navigation.goBack()} />} />

      <MapView
        center={routeCoords[0] ?? driver}
        routeCoords={routeCoords}
        driver={driver}
        poiMarkers={poiMarkers}
        radarMarkers={radarMarkers}
        showPoi={showPoi}
        showRadars={showRadars}
      >
        <Card>
          <RoutePolyline
            distanceMeters={routeQuery.data?.distanceMeters}
            durationSeconds={routeQuery.data?.durationSeconds}
            etaSeconds={etaQuery.data?.etaSeconds}
            price={tripQuery.data?.price}
          />
        </Card>
      </MapView>

      {etaQuery.error ? <NearbyAlertBanner message="ETA unavailable, route not ready." /> : null}

      <Card>
        <Text style={{ fontWeight: '700' }}>Trip #{tripId.slice(0, 8)}</Text>
        <Text>Driver: {tripQuery.data?.driver?.phone ?? 'n/a'}</Text>
        <Text>ETA: {etaQuery.data?.etaSeconds ? Math.max(1, Math.round(Number(etaQuery.data.etaSeconds) / 60)) : 'n/a'} min</Text>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title={showPoi ? 'Hide POI' : 'Show POI'} variant="secondary" onPress={() => setShowPoi((prev) => !prev)} />
          <Button title={showRadars ? 'Hide Radars' : 'Show Radars'} variant="secondary" onPress={() => setShowRadars((prev) => !prev)} />
        </View>

        <PoiLayer poi={poiMarkers} />
        <RadarLayer radars={radarMarkers} />
      </Card>

      <Card>
        <Button title="Request seats" onPress={() => navigation.navigate('CreateRequest', { tripId })} />
      </Card>

      {tripQuery.error ? (
        <Card>
          <EmptyState title="Failed to load trip" description={tripQuery.error} actionLabel="Retry" onAction={() => tripQuery.reload()} />
        </Card>
      ) : null}
    </Screen>
  );
}
