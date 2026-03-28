import { Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { EmptyState } from '../../ui/components/EmptyState';
import { Skeleton } from '../../ui/components/Skeleton';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapItems } from '../../api/mappers/dto';
import { formatStatusLabel } from '../../core/format';

export function DriverBookingsScreen() {
  const query = useQuery(async () => unwrapItems<any>(await api.bookings.driver()), []);

  return (
    <Screen>
      <Topbar title="Бронирования" />

      {query.loading ? (
        <Card>
          <Skeleton height={16} />
          <Skeleton height={16} />
        </Card>
      ) : null}

      {query.error ? (
        <Card>
          <EmptyState
            title="Не удалось загрузить брони"
            description={query.error}
            actionLabel="Повторить"
            onAction={() => query.reload()}
          />
        </Card>
      ) : null}

      {(query.data ?? []).map((booking) => (
        <Card key={String(booking.id)}>
          <Text style={{ fontWeight: '700' }}>
            {booking?.trip?.fromCity?.name && booking?.trip?.toCity?.name
              ? `${booking.trip.fromCity.name} -> ${booking.trip.toCity.name}`
              : 'Маршрут не указан'}
          </Text>
          <Text>Статус: {formatStatusLabel(String(booking.status ?? ''))}</Text>
        </Card>
      ))}

      {!query.loading && !query.error && !(query.data ?? []).length ? (
        <Card>
          <EmptyState title="Бронирований пока нет" />
        </Card>
      ) : null}
    </Screen>
  );
}
