import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { Badge } from '../../ui/components/Badge';
import { Chip } from '../../ui/components/Chip';
import { Skeleton } from '../../ui/components/Skeleton';
import { RequestStatusStrip } from '../../ui/components/RequestStatusStrip';
import { MapView } from '../../ui/components/Map/MapView';
import { RoutePolyline } from '../../ui/components/Map/RoutePolyline';
import { PoiLayer } from '../../ui/components/Map/PoiLayer';
import { RadarLayer } from '../../ui/components/Map/RadarLayer';
import { NearbyAlertBanner } from '../../ui/components/Map/NearbyAlertBanner';
import { EmptyState } from '../../ui/components/EmptyState';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapItems, unwrapPayload } from '../../api/mappers/dto';
import { decodeRoutePolyline } from '../../core/location/polyline';
import { getCached, setCached } from '../../core/cache/simple-cache';
import {
  formatDateTime,
  formatDistance,
  formatEtaSeconds,
  formatMoney,
  formatStatusLabel,
} from '../../core/format';
import type { MapMarker } from '../../ui/components/Map/types';

type RouteData = {
  polyline?: string;
  distanceMeters?: number;
  durationSeconds?: number;
};

function mapPoiToMarker(items: any[]): MapMarker[] {
  return items
    .filter((item) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon)))
    .map((item, idx) => ({
      id: String(item.id ?? `poi-${idx}`),
      lat: Number(item.lat),
      lon: Number(item.lon),
      kind:
        String(item.type ?? '').includes('speed') || String(item.type ?? '').includes('hazard')
          ? 'radar'
          : 'poi',
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
  const myRequestQuery = useQuery(async () => unwrapPayload<any>(await api.trips.myRequestsForTrip(tripId)), [tripId]);

  const request = myRequestQuery.data;
  const requestStatus = String(request?.status ?? '').toLowerCase();
  const requestId = String(request?.id ?? '');
  const bookingId = String(request?.booking?.id ?? '');
  const canTrackDriver =
    Boolean(bookingId) || ['accepted', 'confirmed', 'paid', 'started', 'completed'].includes(requestStatus);

  const locationQuery = useQuery(
    async () => unwrapPayload<any>(await api.geo.getDriverLocation(tripId)),
    [tripId],
    { enabled: canTrackDriver },
  );
  const etaQuery = useQuery(
    async () => unwrapPayload<any>(await api.routing.tripEta(tripId)),
    [tripId],
    { enabled: canTrackDriver },
  );

  useEffect(() => {
    const timer = setInterval(() => {
      myRequestQuery.reload().catch(() => undefined);
      if (canTrackDriver) {
        locationQuery.reload().catch(() => undefined);
        etaQuery.reload().catch(() => undefined);
      }
    }, 3500);

    return () => clearInterval(timer);
  }, [canTrackDriver, etaQuery, locationQuery, myRequestQuery]);

  const poiQuery = useQuery(
    async () => {
      const routePolyline = routeQuery.data?.polyline;
      const cacheKey = `poi-route:${tripId}:${routePolyline ?? 'none'}`;
      const cached = await getCached<any[]>(cacheKey);
      if (cached) return cached;

      let routePoints: any[] = [];
      if (routePolyline) {
        try {
          routePoints = unwrapItems<any>(
            await api.poi.alongRoute({
              polyline: routePolyline,
              bufferMeters: 1200,
            }),
          );
        } catch {
          routePoints = [];
        }
      }

      if (routePoints.length) {
        await setCached(cacheKey, routePoints, 120_000);
        return routePoints;
      }

      const fromCity = tripQuery.data?.fromCity;
      if (fromCity?.lat && fromCity?.lon) {
        const nearby = await (async () => {
          try {
            return unwrapItems<any>(
              await api.poi.listNearby({
                lat: Number(fromCity.lat),
                lon: Number(fromCity.lon),
                radiusMeters: 2000,
              }),
            );
          } catch {
            return [];
          }
        })();
        await setCached(cacheKey, nearby, 120_000);
        return nearby;
      }

      return [];
    },
    [tripId, routeQuery.data?.polyline ?? '', tripQuery.data?.fromCity?.lat ?? '', tripQuery.data?.fromCity?.lon ?? ''],
  );

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

  const negotiationQuery = useQuery(
    async () => (requestId ? unwrapPayload<any>(await api.requests.negotiation(requestId)) : null),
    [requestId],
    { enabled: Boolean(requestId) },
  );

  const canCreateNewRequest =
    !request || ['rejected', 'canceled', 'expired'].includes(requestStatus.toLowerCase());

  return (
    <Screen>
      <Topbar title="Детали рейса" right={<Button title="Назад" variant="ghost" onPress={() => navigation.goBack()} />} />

      {tripQuery.loading && !tripQuery.data ? (
        <Card>
          <Skeleton height={20} />
          <Skeleton height={16} />
          <Skeleton height={16} />
        </Card>
      ) : null}

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

      {canTrackDriver && etaQuery.error ? (
        <NearbyAlertBanner message="ETA временно недоступен, обновим после следующей точки." />
      ) : null}

      <Card>
        <Text style={{ fontWeight: '700' }}>
          {tripQuery.data?.fromCity?.name && tripQuery.data?.toCity?.name
            ? `${tripQuery.data.fromCity.name} -> ${tripQuery.data.toCity.name}`
            : 'Маршрут поездки'}
        </Text>
        {tripQuery.data?.status ? <Badge label={String(tripQuery.data.status)} /> : null}
        <Text>Водитель: {tripQuery.data?.driver?.phone ?? 'нет данных'}</Text>
        <Text>
          Отправление:{' '}
          {tripQuery.data?.departureAt ? formatDateTime(tripQuery.data.departureAt) : '-'}
        </Text>
        <Text>Цена: {formatMoney(Number(tripQuery.data?.price ?? 0), String(tripQuery.data?.currency ?? 'UZS'))}</Text>
        <Text>ETA: {canTrackDriver ? formatEtaSeconds(etaQuery.data?.etaSeconds) : 'Доступно после подтверждения заявки'}</Text>
        <Text>
          Расстояние:{' '}
          {canTrackDriver
            ? formatDistance(etaQuery.data?.distanceMeters ?? routeQuery.data?.distanceMeters)
            : formatDistance(routeQuery.data?.distanceMeters)}
        </Text>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title={showPoi ? 'Скрыть POI' : 'Показать POI'} variant="secondary" onPress={() => setShowPoi((prev) => !prev)} />
          <Button title={showRadars ? 'Скрыть радары' : 'Показать радары'} variant="secondary" onPress={() => setShowRadars((prev) => !prev)} />
        </View>

        <PoiLayer poi={poiMarkers} />
        <RadarLayer radars={radarMarkers} />
      </Card>

      <Card>
        <Text style={{ fontWeight: '700' }}>Моя заявка</Text>
        {myRequestQuery.loading ? <Text>Проверяем вашу заявку...</Text> : null}
        {request ? (
          <>
            <RequestStatusStrip
              status={requestStatus || 'pending'}
              nextTurn={
                negotiationQuery.data?.nextTurn === 'driver'
                  ? 'driver'
                  : negotiationQuery.data?.nextTurn === 'passenger'
                    ? 'passenger'
                    : null
              }
              movesLeftPassenger={negotiationQuery.data?.passengerMovesLeft}
              movesLeftDriver={negotiationQuery.data?.driverMovesLeft}
            />
            <Text>Статус: {formatStatusLabel(requestStatus)}</Text>
            <Text>Мест: {request.seats ?? '-'}</Text>
            <Text>Предложение: {formatMoney(Number(request.price ?? 0), String(request.currency ?? 'UZS'))}</Text>

            {Array.isArray(request.seatNumbers) && request.seatNumbers.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {request.seatNumbers.map((seat: string) => (
                  <Chip key={seat} label={`Место ${seat}`} />
                ))}
              </View>
            ) : null}

            <View style={{ gap: 6 }}>
              {request.pickupAddress ? <Chip label={`Посадка: ${request.pickupAddress}`} /> : null}
              {request.dropoffAddress ? <Chip label={`Высадка: ${request.dropoffAddress}`} /> : null}
            </View>

            {requestId ? (
              <Button title="Открыть торг" variant="secondary" onPress={() => navigation.navigate('PassengerNegotiation', { requestId })} />
            ) : null}

            {bookingId ? (
              <Button title="Открыть бронь" onPress={() => navigation.navigate('BookingDetails', { bookingId, tripId })} />
            ) : null}

            <Button
              title="Изменить заявку"
              variant="ghost"
              onPress={() => navigation.navigate('CreateRequest', { tripId })}
            />
          </>
        ) : (
          <Text>Заявка для этого рейса пока не создана.</Text>
        )}

        {canCreateNewRequest ? (
          <Button title="Создать заявку" onPress={() => navigation.navigate('CreateRequest', { tripId })} />
        ) : null}
      </Card>

      {tripQuery.error ? (
        <Card>
          <EmptyState
            title="Не удалось загрузить рейс"
            description={tripQuery.error}
            actionLabel="Повторить"
            onAction={() => tripQuery.reload()}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
