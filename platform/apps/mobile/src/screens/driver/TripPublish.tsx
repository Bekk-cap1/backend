import { Text, View } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { EmptyState } from '../../ui/components/EmptyState';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapItems, unwrapPayload } from '../../api/mappers/dto';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';
import { formatStatusLabel } from '../../core/format';

export function DriverTripsScreen({ navigation }: { navigation: any }) {
  const { show } = useToast();
  const tripsQuery = useQuery(async () => unwrapItems<any>(await api.trips.list({ mine: true })), []);
  const verificationQuery = useQuery(async () => unwrapPayload<any>(await api.drivers.me()), []);
  const verificationStatus = String(verificationQuery.data?.status ?? 'draft').toLowerCase();
  const isVerified = verificationStatus === 'verified';

  return (
    <Screen>
      <Topbar
        title="Мои поездки"
        right={
          <Button
            title="Создать"
            variant="secondary"
            onPress={() => (isVerified ? navigation.navigate('CreateTrip') : navigation.navigate('DriverVerification'))}
          />
        }
      />

      {!isVerified ? (
        <Card>
          <Text style={{ fontWeight: '700' }}>Верификация не завершена</Text>
          <Text style={{ opacity: 0.8 }}>
            Статус: {formatStatusLabel(verificationStatus)}. Чтобы публиковать поездки, завершите проверку.
          </Text>
        </Card>
      ) : null}

      {tripsQuery.loading ? (
        <Card>
          <Text>Загружаем список поездок...</Text>
        </Card>
      ) : null}

      {tripsQuery.error ? (
        <Card>
          <EmptyState
            title="Не удалось загрузить поездки"
            description={tripsQuery.error}
            actionLabel="Повторить"
            onAction={() => tripsQuery.reload()}
          />
        </Card>
      ) : null}

      {!tripsQuery.loading && !tripsQuery.error && (tripsQuery.data ?? []).length === 0 ? (
        <Card>
          <EmptyState
            title="Поездок пока нет"
            description="Создайте и опубликуйте поездку, чтобы начать принимать заявки."
            actionLabel="Создать поездку"
            onAction={() => (isVerified ? navigation.navigate('CreateTrip') : navigation.navigate('DriverVerification'))}
          />
        </Card>
      ) : null}

      {(tripsQuery.data ?? []).map((trip) => (
        <Card key={String(trip.id)}>
          <Text style={{ fontWeight: '700' }}>
            {trip?.fromCity?.name && trip?.toCity?.name
              ? `${trip.fromCity.name} -> ${trip.toCity.name}`
              : 'Маршрут не указан'}
          </Text>
          <Text>Статус: {formatStatusLabel(trip.status)}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              title="Опубликовать"
              disabled={!isVerified}
              onPress={async () => {
                try {
                  await api.trips.publish(String(trip.id));
                  show({ title: 'Поездка опубликована', tone: 'success' });
                  await tripsQuery.reload();
                } catch (error) {
                  show({ title: toErrorMessage(error), tone: 'danger' });
                }
              }}
            />
            <Button title="Открыть рейс" variant="secondary" onPress={() => navigation.navigate('ActiveTrip', { tripId: String(trip.id) })} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}
