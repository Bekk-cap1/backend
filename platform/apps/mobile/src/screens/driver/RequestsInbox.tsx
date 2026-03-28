import { Text, View } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { EmptyState } from '../../ui/components/EmptyState';
import { RequestStatusStrip } from '../../ui/components/RequestStatusStrip';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapItems, unwrapPayload } from '../../api/mappers/dto';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';
import { formatMoney, formatStatusLabel } from '../../core/format';

export function RequestsInboxScreen({ navigation }: { navigation: any }) {
  const { show } = useToast();
  const queue = useQuery(async () => unwrapItems<any>(await api.requests.driverQueue()), []);
  const verificationQuery = useQuery(async () => unwrapPayload<any>(await api.drivers.me()), []);
  const verificationStatus = String(verificationQuery.data?.status ?? 'draft').toLowerCase();
  const isVerified = verificationStatus === 'verified';

  return (
    <Screen>
      <Topbar title="Входящие заявки" />

      {!isVerified ? (
        <Card>
          <Text style={{ fontWeight: '700' }}>Нужна верификация</Text>
          <Text style={{ opacity: 0.8 }}>
            Статус: {formatStatusLabel(verificationStatus)}. До подтверждения нельзя принимать заявки.
          </Text>
          <Button title="Открыть верификацию" onPress={() => navigation.navigate('DriverVerification')} />
        </Card>
      ) : null}

      {queue.loading ? (
        <Card>
          <Text>Загружаем заявки...</Text>
        </Card>
      ) : null}

      {queue.error ? (
        <Card>
          <EmptyState
            title="Не удалось загрузить заявки"
            description={queue.error}
            actionLabel="Повторить"
            onAction={() => queue.reload()}
          />
        </Card>
      ) : null}

      {!queue.loading && !queue.error && (queue.data ?? []).length === 0 ? (
        <Card>
          <EmptyState title="Нет активных заявок" description="Новые заявки появятся здесь." />
        </Card>
      ) : null}

      {(queue.data ?? []).map((request) => (
        <Card key={String(request.id)}>
          <Text style={{ fontWeight: '700' }}>
            {request?.trip?.fromCity?.name && request?.trip?.toCity?.name
              ? `${request.trip.fromCity.name} -> ${request.trip.toCity.name}`
              : 'Маршрут не указан'}
          </Text>
          <RequestStatusStrip status={request.status} />
          <Text>Места: {request.seats ?? 1}</Text>
          <Text>Цена: {formatMoney(Number(request.price ?? 0), String(request.currency ?? 'UZS'))}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Торг" disabled={!isVerified} onPress={() => navigation.navigate('DriverNegotiation', { requestId: request.id })} />
            <Button
              title="Принять"
              variant="secondary"
              disabled={!isVerified}
              onPress={async () => {
                try {
                  await api.trips.acceptRequest(String(request.tripId), String(request.id));
                  show({ title: 'Заявка принята', tone: 'success' });
                  await queue.reload();
                } catch (error) {
                  show({ title: toErrorMessage(error), tone: 'danger' });
                }
              }}
            />
          </View>
        </Card>
      ))}
    </Screen>
  );
}
