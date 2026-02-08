import { Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapItems } from '../../api/mappers/dto';

export function DriverNotificationsScreen() {
  const query = useQuery(async () => unwrapItems<any>(await api.notifications.listMine()), []);

  return (
    <Screen>
      <Topbar title="Alerts" />
      {(query.data ?? []).map((item) => (
        <Card key={String(item.id)}>
          <Text style={{ fontWeight: '700' }}>{item.title ?? 'Notification'}</Text>
          <Text>{item.message ?? item.body ?? ''}</Text>
        </Card>
      ))}
    </Screen>
  );
}
