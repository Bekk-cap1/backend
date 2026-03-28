import { Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { EmptyState } from '../../ui/components/EmptyState';
import { Skeleton } from '../../ui/components/Skeleton';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapItems } from '../../api/mappers/dto';

export function PassengerNotificationsScreen() {
  const query = useQuery(async () => unwrapItems<any>(await api.notifications.listMine()), []);

  return (
    <Screen>
      <Topbar title="Уведомления" />

      {query.loading ? (
        <Card>
          <Skeleton height={18} />
          <Skeleton height={14} />
          <Skeleton height={14} />
        </Card>
      ) : null}

      {query.error ? (
        <Card>
          <EmptyState
            title="Не удалось загрузить уведомления"
            description={query.error}
            actionLabel="Повторить"
            onAction={() => query.reload()}
          />
        </Card>
      ) : null}

      {(query.data ?? []).map((item) => (
        <Card key={String(item.id)}>
          <Text style={{ fontWeight: '700' }}>{item.title ?? 'Уведомление'}</Text>
          <Text>{item.body ?? item.message ?? ''}</Text>
          {!item.readAt ? (
            <Button
              title="Отметить как прочитанное"
              onPress={() => api.notifications.markRead(String(item.id)).then(() => query.reload())}
            />
          ) : null}
        </Card>
      ))}

      {!query.loading && !query.error && !(query.data ?? []).length ? (
        <Card>
          <EmptyState title="Пока пусто" description="Новые уведомления появятся здесь." />
        </Card>
      ) : null}
    </Screen>
  );
}
