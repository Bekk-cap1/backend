import { Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapItems } from '../../api/mappers/dto';

export function PassengerNotificationsScreen() {
  const query = useQuery(async () => unwrapItems<any>(await api.notifications.listMine()), []);

  return (
    <Screen>
      <Topbar title="Alerts" />
      {(query.data ?? []).map((item) => (
        <Card key={String(item.id)}>
          <Text style={{ fontWeight: '700' }}>{item.title ?? 'Notification'}</Text>
          <Text>{item.body ?? item.message ?? ''}</Text>
          {!item.readAt ? (
            <Button title="Mark read" onPress={() => api.notifications.markRead(String(item.id)).then(() => query.reload())} />
          ) : null}
        </Card>
      ))}
      {!query.loading && !(query.data ?? []).length ? (
        <Card>
          <Text>No notifications</Text>
        </Card>
      ) : null}
    </Screen>
  );
}
