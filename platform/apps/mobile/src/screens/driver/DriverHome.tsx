import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { EmptyState } from '../../ui/components/EmptyState';
import { Skeleton } from '../../ui/components/Skeleton';
import { Badge } from '../../ui/components/Badge';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapItems, unwrapPayload } from '../../api/mappers/dto';
import { formatDateTime } from '../../core/format';

export function DriverHomeScreen({ navigation }: { navigation: any }) {
  const driverProfileQuery = useQuery(async () => unwrapPayload<any>(await api.drivers.me()), []);
  const requestsQuery = useQuery(async () => unwrapItems<any>(await api.requests.driverQueue()), []);
  const tripsQuery = useQuery(async () => unwrapItems<any>(await api.trips.list({ mine: true })), []);

  const profileStatus = String(driverProfileQuery.data?.status ?? 'draft').toLowerCase();
  const isVerified = profileStatus === 'verified';

  const nextTrip = useMemo(() => {
    const now = Date.now();
    return (tripsQuery.data ?? [])
      .filter((trip) => trip?.departureAt)
      .sort(
        (a, b) =>
          Math.abs(new Date(String(a.departureAt)).getTime() - now) -
          Math.abs(new Date(String(b.departureAt)).getTime() - now),
      )[0];
  }, [tripsQuery.data]);

  const hasLoading = driverProfileQuery.loading || requestsQuery.loading || tripsQuery.loading;

  return (
    <Screen>
      <Topbar title="Панель водителя" />

      <Card>
        <Text style={{ fontSize: 18, fontWeight: '700' }}>Сводка на сегодня</Text>
        {hasLoading ? (
          <>
            <Skeleton height={16} />
            <Skeleton height={16} />
          </>
        ) : (
          <>
            <Text style={{ opacity: 0.8 }}>Новые запросы: {(requestsQuery.data ?? []).length}</Text>
            <Text style={{ opacity: 0.8 }}>Поездок в графике: {(tripsQuery.data ?? []).length}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ opacity: 0.8 }}>Статус верификации:</Text>
              <Badge label={profileStatus} />
            </View>
          </>
        )}
      </Card>

      {!isVerified ? (
        <Card>
          <Text style={{ fontWeight: '700' }}>Нужна верификация водителя</Text>
          <Text style={{ opacity: 0.8 }}>
            Отправьте документы, чтобы публиковать поездки и принимать заявки.
          </Text>
          <Button title="Открыть верификацию" onPress={() => navigation.navigate('DriverVerification')} />
        </Card>
      ) : null}

      <Card>
        <Text style={{ fontSize: 16, fontWeight: '700' }}>Ближайшая поездка</Text>
        {nextTrip ? (
          <>
            <Text>
              Маршрут: {nextTrip?.fromCity?.name ?? '-'} {'->'} {nextTrip?.toCity?.name ?? '-'}
            </Text>
            <Text>Отправление: {nextTrip?.departureAt ? formatDateTime(nextTrip.departureAt) : '-'}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="Открыть рейс" onPress={() => navigation.navigate('ActiveTrip', { tripId: String(nextTrip.id) })} />
              <Button title="Заявки" variant="secondary" onPress={() => navigation.navigate('Requests')} />
            </View>
          </>
        ) : (
          <EmptyState
            title="Поездок пока нет"
            description="Создайте и опубликуйте первую поездку, чтобы получать заявки."
            actionLabel="Создать поездку"
            onAction={() => navigation.navigate('CreateTrip')}
          />
        )}
      </Card>

      <Card>
        <Text style={{ fontSize: 16, fontWeight: '700' }}>Быстрые действия</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            title="Новая поездка"
            onPress={() =>
              isVerified ? navigation.navigate('CreateTrip') : navigation.navigate('DriverVerification')
            }
          />
          <Button title="Автомобили" variant="secondary" onPress={() => navigation.navigate('Vehicles')} />
        </View>
      </Card>
    </Screen>
  );
}
