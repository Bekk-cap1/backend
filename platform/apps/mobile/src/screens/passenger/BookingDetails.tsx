import { useEffect, useMemo } from 'react';
import { Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { Badge } from '../../ui/components/Badge';
import { Skeleton } from '../../ui/components/Skeleton';
import { EmptyState } from '../../ui/components/EmptyState';
import { TripProgressTimeline, type TripProgressStep } from '../../ui/components/TripProgressTimeline';
import { MapView } from '../../ui/components/Map/MapView';
import { RoutePolyline } from '../../ui/components/Map/RoutePolyline';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapPayload } from '../../api/mappers/dto';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';
import { formatEtaSeconds, formatMoney, formatStatusLabel } from '../../core/format';

export function BookingDetailsScreen({ route, navigation }: { route: any; navigation: any }) {
  const bookingId = String(route.params?.bookingId ?? '');
  const { show } = useToast();

  const bookingQuery = useQuery(async () => unwrapPayload<any>(await api.bookings.getById(bookingId)), [bookingId]);
  const tripId = String(bookingQuery.data?.tripId ?? '');

  const locationQuery = useQuery(
    async () => (tripId ? unwrapPayload<any>(await api.geo.getDriverLocation(tripId)) : null),
    [tripId],
  );

  const etaQuery = useQuery(
    async () => (tripId ? unwrapPayload<any>(await api.geo.getTripEta(tripId)) : null),
    [tripId],
  );

  useEffect(() => {
    if (!tripId) return;
    const timer = setInterval(() => {
      locationQuery.reload().catch(() => undefined);
      etaQuery.reload().catch(() => undefined);
    }, 4500);
    return () => clearInterval(timer);
  }, [etaQuery, locationQuery, tripId]);

  const mapCenter = useMemo(() => {
    const point = locationQuery.data?.location ?? locationQuery.data;
    if (!point?.lat || !point?.lon) return null;
    return { lat: Number(point.lat), lon: Number(point.lon) };
  }, [locationQuery.data]);

  const steps = useMemo<TripProgressStep[]>(() => {
    const bookingStatus = String(bookingQuery.data?.status ?? '');
    const requestStatus = String(bookingQuery.data?.request?.status ?? '');
    const tripStatus = String(bookingQuery.data?.trip?.status ?? '');
    const paymentStatuses = Array.isArray(bookingQuery.data?.payments)
      ? bookingQuery.data.payments.map((item: any) => String(item?.status ?? '').toLowerCase())
      : [];

    const paymentPaid =
      paymentStatuses.includes('paid') || bookingStatus === 'paid' || bookingStatus === 'completed';
    const requestFailed = ['rejected', 'canceled', 'expired'].includes(requestStatus);

    return [
      {
        id: 'request',
        label: 'Заявка подтверждена',
        state: requestFailed ? 'failed' : requestStatus === 'pending' ? 'active' : 'completed',
        subtitle: formatStatusLabel(requestStatus || 'pending'),
      },
      {
        id: 'booking',
        label: 'Бронь создана',
        state: ['confirmed', 'paid', 'completed'].includes(bookingStatus)
          ? 'completed'
          : bookingStatus === 'canceled'
            ? 'failed'
            : 'pending',
        subtitle: formatStatusLabel(bookingStatus || 'pending'),
      },
      {
        id: 'payment',
        label: 'Оплата',
        state: paymentPaid
          ? 'completed'
          : bookingStatus === 'confirmed'
            ? 'active'
            : bookingStatus === 'canceled'
              ? 'failed'
              : 'pending',
        subtitle: paymentPaid ? 'Оплачено' : 'Ожидает оплаты',
      },
      {
        id: 'started',
        label: 'Поездка началась',
        state: ['started', 'completed'].includes(tripStatus)
          ? 'completed'
          : tripStatus === 'canceled'
            ? 'failed'
            : paymentPaid
              ? 'active'
              : 'pending',
        subtitle: formatStatusLabel(tripStatus || 'pending'),
      },
      {
        id: 'completed',
        label: 'Поездка завершена',
        state: tripStatus === 'completed' ? 'completed' : tripStatus === 'canceled' ? 'failed' : 'pending',
      },
    ];
  }, [bookingQuery.data]);

  return (
    <Screen>
      <Topbar title="Детали брони" right={<Button title="Назад" variant="ghost" onPress={() => navigation.goBack()} />} />

      {bookingQuery.loading && !bookingQuery.data ? (
        <Card>
          <Skeleton height={20} />
          <Skeleton height={16} />
          <Skeleton height={16} />
        </Card>
      ) : null}

      {bookingQuery.error ? (
        <Card>
          <EmptyState
            title="Не удалось загрузить бронь"
            description={bookingQuery.error}
            actionLabel="Повторить"
            onAction={() => bookingQuery.reload()}
          />
        </Card>
      ) : null}

      <Card>
        <Badge label={String(bookingQuery.data?.status ?? 'unknown')} />
        <Text>
          Маршрут:{' '}
          {bookingQuery.data?.trip?.fromCity?.name && bookingQuery.data?.trip?.toCity?.name
            ? `${bookingQuery.data.trip.fromCity.name} -> ${bookingQuery.data.trip.toCity.name}`
            : 'не указан'}
        </Text>
        <Text>Мест: {bookingQuery.data?.seats ?? 'n/a'}</Text>
        <Text>
          Сумма: {formatMoney(Number(bookingQuery.data?.price ?? 0), String(bookingQuery.data?.currency ?? 'UZS'))}
        </Text>
        <Text>ETA: {formatEtaSeconds(etaQuery.data?.etaSeconds)}</Text>
        <TripProgressTimeline steps={steps} />
      </Card>

      <MapView center={mapCenter}>
        <RoutePolyline
          distanceMeters={bookingQuery.data?.distanceMeters}
          durationSeconds={bookingQuery.data?.durationSeconds}
          etaSeconds={etaQuery.data?.etaSeconds}
        />
      </MapView>

      <Card>
        <Button title="Оплатить" onPress={() => navigation.navigate('Payments', { bookingId, tripId })} />
        <Button title="Онлайн-трекинг" variant="secondary" onPress={() => navigation.navigate('LiveTrip', { bookingId, tripId })} />
        <Button
          title="Рассчитать отмену"
          variant="secondary"
          onPress={async () => {
            try {
              const quote = unwrapPayload<any>(await api.cancellations.quote(bookingId));
              show({
                title: `Возврат ${quote.refundAmount ?? 0}, комиссия ${quote.feeAmount ?? 0}`,
                tone: 'info',
              });
            } catch (error) {
              show({ title: toErrorMessage(error), tone: 'danger' });
            }
          }}
        />
        <Button
          title="Отменить бронь"
          variant="destructive"
          onPress={async () => {
            try {
              await api.cancellations.apply(bookingId);
              show({ title: 'Бронь отменена', tone: 'success' });
              await bookingQuery.reload();
            } catch (error) {
              show({ title: toErrorMessage(error), tone: 'danger' });
            }
          }}
        />
      </Card>
    </Screen>
  );
}
