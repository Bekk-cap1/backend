import { useQuery } from './useQuery';
import { useMutation } from './useMutation';
import { api } from '../client';
import { unwrapItems } from '../mappers/dto';

export function useNotifications() {
  const list = useQuery(async () => unwrapItems<any>(await api.notifications.listMine({ pageSize: 50 })), []);
  const markRead = useMutation(async (id: string) => api.notifications.markRead(id));
  return { list, markRead };
}
