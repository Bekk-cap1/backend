import { Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapItems } from '../../api/mappers/dto';
import { EmptyState } from '../../ui/components/EmptyState';
import { Skeleton } from '../../ui/components/Skeleton';
import { Badge } from '../../ui/components/Badge';
import { formatDateTime } from '../../core/format';

export function MyTripsScreen({ navigation }: { navigation: any }) {
  const bookingsQuery = useQuery(async () => unwrapItems<any>(await api.bookings.my()), []);

  return (
    <Screen>
      <Topbar title="Мои поездки" />

      {bookingsQuery.loading ? (
        <Card>
          <Skeleton height={20} />
          <Skeleton height={16} />
          <Skeleton height={16} />
        </Card>
      ) : null}

      {bookingsQuery.error ? (
        <Card>
          <EmptyState
            title="Не удалось загрузить брони"
            description={bookingsQuery.error}
            actionLabel="Повторить"
            onAction={() => bookingsQuery.reload()}
          />
        </Card>
      ) : null}

      {(bookingsQuery.data ?? []).map((booking) => (
        <Card key={String(booking.id)}>
          <Text style={{ fontWeight: '700' }}>
            {booking?.trip?.fromCity?.name && booking?.trip?.toCity?.name
              ? `${booking.trip.fromCity.name} -> ${booking.trip.toCity.name}`
              : 'Межгородняя поездка'}
          </Text>
          <Badge label={String(booking.status ?? 'unknown')} />
          <Text>Отправление: {booking?.trip?.departureAt ? formatDateTime(booking.trip.departureAt) : '-'}</Text>
          <Text>Мест: {booking?.seats ?? 'n/a'}</Text>
          <Button title="Детали" onPress={() => navigation.navigate('BookingDetails', { bookingId: booking.id })} />
        </Card>
      ))}

      {!bookingsQuery.loading && !(bookingsQuery.data ?? []).length ? (
        <Card>
          <EmptyState
            title="Пока нет бронирований"
            description="Откройте поиск рейсов и отправьте заявку на подходящий маршрут."
          />
        </Card>
      ) : null}
    </Screen>
  );
}
