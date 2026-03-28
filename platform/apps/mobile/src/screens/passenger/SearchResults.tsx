import { useMemo } from 'react';
import { FlatList, Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { EmptyState } from '../../ui/components/EmptyState';
import { Skeleton } from '../../ui/components/Skeleton';
import { Badge } from '../../ui/components/Badge';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapItems } from '../../api/mappers/dto';
import { formatDateTime, formatMoney } from '../../core/format';

type Trip = {
  id: string;
  price?: number;
  currency?: string;
  departureAt?: string;
  seatsAvailable?: number;
  seatsTotal?: number;
  driver?: { phone?: string };
  status?: string;
};

export function SearchResultsScreen({ route, navigation }: { route: any; navigation: any }) {
  const params = route.params ?? {};
  const searchParams = useMemo(
    () => {
      const parsedSeats = params.seats == null ? undefined : Number(params.seats);
      const date = params.date ? String(params.date) : undefined;
      return {
        fromCityId: params.fromCityId ? String(params.fromCityId) : undefined,
        toCityId: params.toCityId ? String(params.toCityId) : undefined,
        ...(date ? { dateFrom: date, dateTo: date } : {}),
        seats: Number.isFinite(parsedSeats) ? parsedSeats : undefined,
      };
    },
    [params.date, params.fromCityId, params.seats, params.toCityId],
  );

  const tripsQuery = useQuery(async () => {
    const response = await api.trips.search(searchParams);
    return unwrapItems<Trip>(response);
  }, [JSON.stringify(searchParams)]);

  const title = useMemo(() => {
    const from = params.fromCityName ?? 'Откуда';
    const to = params.toCityName ?? 'Куда';
    return `${from} -> ${to}`;
  }, [params.fromCityName, params.toCityName]);

  return (
    <Screen>
      <Topbar title={title} right={<Button title="Назад" variant="ghost" onPress={() => navigation.goBack()} />} />

      {tripsQuery.loading ? (
        <Card>
          <Skeleton height={20} />
          <Skeleton height={16} />
          <Skeleton height={16} />
        </Card>
      ) : null}

      {tripsQuery.error ? (
        <Card>
          <EmptyState
            title="Не удалось загрузить рейсы"
            description={tripsQuery.error}
            actionLabel="Повторить"
            onAction={() => tripsQuery.reload()}
          />
        </Card>
      ) : null}

      {!tripsQuery.loading && !tripsQuery.error ? (
        <FlatList
          data={tripsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <Card>
              <Text style={{ fontSize: 16, fontWeight: '700' }}>Межгородний рейс</Text>
              {item.status ? <Badge label={String(item.status)} /> : null}
              <Text>Отправление: {item.departureAt ? formatDateTime(item.departureAt) : '-'}</Text>
              <Text>Свободных мест: {item.seatsAvailable ?? item.seatsTotal ?? 0}</Text>
              <Text>Водитель: {item.driver?.phone ?? '-'}</Text>
              <Text>Цена: {formatMoney(item.price ?? 0, item.currency ?? 'UZS')}</Text>
              <Button title="Открыть детали" onPress={() => navigation.navigate('TripDetails', { tripId: item.id })} />
            </Card>
          )}
          ListEmptyComponent={
            <EmptyState
              title="Рейсы не найдены"
              description="Измените дату, города или количество мест и попробуйте снова."
            />
          }
        />
      ) : null}
    </Screen>
  );
}
