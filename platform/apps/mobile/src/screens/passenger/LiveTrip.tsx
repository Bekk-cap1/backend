import { useEffect, useMemo } from 'react';
import { Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { EmptyState } from '../../ui/components/EmptyState';
import { Skeleton } from '../../ui/components/Skeleton';
import { TripProgressTimeline, type TripProgressStep } from '../../ui/components/TripProgressTimeline';
import { MapView } from '../../ui/components/Map/MapView';
import { RoutePolyline } from '../../ui/components/Map/RoutePolyline';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { decodeRoutePolyline } from '../../core/location/polyline';
import { unwrapPayload } from '../../api/mappers/dto';
import { formatDistance, formatEtaSeconds } from '../../core/format';

export function PassengerLiveTripScreen({ route, navigation }: { route: any; navigation: any }) {
  const tripId = String(route.params?.tripId ?? '');
  const bookingId = String(route.params?.bookingId ?? '');

  const bookingQuery = useQuery(
    async () => (bookingId ? unwrapPayload<any>(await api.bookings.getById(bookingId)) : null),
    [bookingId],
  );
  const routeQuery = useQuery(async () => unwrapPayload<any>(await api.routing.tripRoute(tripId)), [tripId]);
  const locationQuery = useQuery(async () => unwrapPayload<any>(await api.geo.getDriverLocation(tripId)), [tripId]);
  const etaQuery = useQuery(async () => unwrapPayload<any>(await api.geo.getTripEta(tripId)), [tripId]);

  useEffect(() => {
    const interval = setInterval(() => {
      locationQuery.reload().catch(() => undefined);
      etaQuery.reload().catch(() => undefined);
      routeQuery.reload().catch(() => undefined);
      bookingQuery.reload().catch(() => undefined);
    }, 4000);
    return () => clearInterval(interval);
  }, [bookingQuery, etaQuery, locationQuery, routeQuery]);

  const routeCoords = useMemo(() => decodeRoutePolyline(routeQuery.data?.polyline), [routeQuery.data?.polyline]);

  const driverPoint = useMemo(() => {
    const point = locationQuery.data?.location ?? locationQuery.data;
    if (!point?.lat || !point?.lon) return null;
    return { lat: Number(point.lat), lon: Number(point.lon) };
  }, [locationQuery.data]);

  const steps = useMemo<TripProgressStep[]>(() => {
    const bookingStatus = String(bookingQuery.data?.status ?? '');
    const tripStatus = String(bookingQuery.data?.trip?.status ?? '');
    const isPaid = bookingStatus === 'paid' || bookingStatus === 'completed';
    return [
      {
        id: 'booking',
        label: 'Бронь подтверждена',
        state: ['confirmed', 'paid', 'completed'].includes(bookingStatus)
          ? 'completed'
          : bookingStatus
            ? 'failed'
            : 'pending',
      },
      {
        id: 'payment',
        label: 'Оплата',
        state: isPaid ? 'completed' : bookingStatus === 'confirmed' ? 'active' : 'pending',
      },
      {
        id: 'started',
        label: 'Поездка началась',
        state: ['started', 'completed'].includes(tripStatus) ? 'completed' : isPaid ? 'active' : 'pending',
      },
      {
        id: 'completed',
        label: 'Поездка завершена',
        state: tripStatus === 'completed' ? 'completed' : 'pending',
      },
    ];
  }, [bookingQuery.data]);

  return (
    <Screen>
      <Topbar title="Онлайн поездка" right={<Button title="Назад" variant="ghost" onPress={() => navigation.goBack()} />} />

      {routeQuery.error || locationQuery.error ? (
        <Card>
          <EmptyState
            title="Маршрут временно недоступен"
            description={routeQuery.error ?? locationQuery.error ?? 'Проверьте сеть и повторите позже.'}
            actionLabel="Повторить"
            onAction={() => {
              routeQuery.reload().catch(() => undefined);
              locationQuery.reload().catch(() => undefined);
              etaQuery.reload().catch(() => undefined);
            }}
          />
        </Card>
      ) : null}

      {(routeQuery.loading || locationQuery.loading) && !routeQuery.data ? (
        <Card>
          <Skeleton height={18} />
          <Skeleton height={18} />
          <Skeleton height={18} />
        </Card>
      ) : null}

      <MapView center={driverPoint} driver={driverPoint} routeCoords={routeCoords}>
        <Card>
          <RoutePolyline
            distanceMeters={etaQuery.data?.distanceMeters}
            durationSeconds={routeQuery.data?.durationSeconds}
            etaSeconds={etaQuery.data?.etaSeconds}
          />
        </Card>
      </MapView>

      <Card>
        <Text style={{ fontWeight: '700' }}>До водителя</Text>
        <Text>ETA: {formatEtaSeconds(etaQuery.data?.etaSeconds)}</Text>
        <Text>Расстояние: {formatDistance(etaQuery.data?.distanceMeters)}</Text>
        <TripProgressTimeline steps={steps} />
        {bookingId ? (
          <Button title="Открыть бронь" variant="secondary" onPress={() => navigation.navigate('BookingDetails', { bookingId })} />
        ) : null}
      </Card>
    </Screen>
  );
}
