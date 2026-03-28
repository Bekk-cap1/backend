import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Input } from '../../ui/components/Input';
import { Button } from '../../ui/components/Button';
import { EmptyState } from '../../ui/components/EmptyState';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapItems, unwrapPayload } from '../../api/mappers/dto';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';
import { formatDateTime, formatStatusLabel } from '../../core/format';

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: string;
  bookingId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export function SupportCenterScreen({ title }: { title: string }) {
  const { show } = useToast();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');

  const ticketsQuery = useQuery(async () => unwrapItems<Ticket>(await api.tickets.my()), []);

  const selectedSummary = useMemo(
    () => (ticketsQuery.data ?? []).find((ticket) => ticket.id === selectedTicketId) ?? null,
    [selectedTicketId, ticketsQuery.data],
  );
  const visibleTickets = useMemo(() => {
    if (statusFilter === 'all') return ticketsQuery.data ?? [];
    return (ticketsQuery.data ?? []).filter((ticket) => String(ticket.status ?? '').toLowerCase() === statusFilter);
  }, [statusFilter, ticketsQuery.data]);

  const createTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      show({ title: 'Заполните тему и сообщение', tone: 'danger' });
      return;
    }
    try {
      await api.tickets.create({
        subject: subject.trim(),
        message: message.trim(),
        bookingId: bookingId.trim() || undefined,
      });
      setSubject('');
      setMessage('');
      setBookingId('');
      show({ title: 'Тикет создан', tone: 'success' });
      await ticketsQuery.reload();
    } catch (error) {
      show({ title: toErrorMessage(error), tone: 'danger' });
    }
  };

  const loadDetails = async (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setDetailsLoading(true);
    try {
      const details = unwrapPayload<Ticket>(await api.tickets.getById(ticketId));
      setSelectedTicket(details);
    } catch (error) {
      setSelectedTicket(null);
      show({ title: toErrorMessage(error), tone: 'danger' });
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <Screen>
      <Topbar title={title} />

      <Card>
        <Text style={{ fontWeight: '700', fontSize: 16 }}>Новый тикет поддержки</Text>
        <Input label="Тема" value={subject} onChangeText={setSubject} placeholder="Кратко опишите проблему" />
        <Input
          label="Сообщение"
          value={message}
          onChangeText={setMessage}
          multiline
          style={{ minHeight: 96, textAlignVertical: 'top' }}
          placeholder="Добавьте подробности"
        />
        <Input
          label="ID брони (опционально)"
          value={bookingId}
          onChangeText={setBookingId}
          placeholder="Связать с конкретной поездкой"
        />
        <Button title="Создать тикет" onPress={createTicket} />
      </Card>

      <Card>
        <Text style={{ fontWeight: '700', fontSize: 16 }}>Мои тикеты</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Button title="Все" variant={statusFilter === 'all' ? 'primary' : 'ghost'} onPress={() => setStatusFilter('all')} />
          <Button title="Открыт" variant={statusFilter === 'open' ? 'primary' : 'ghost'} onPress={() => setStatusFilter('open')} />
          <Button title="В работе" variant={statusFilter === 'in_progress' ? 'primary' : 'ghost'} onPress={() => setStatusFilter('in_progress')} />
          <Button title="Решен" variant={statusFilter === 'resolved' ? 'primary' : 'ghost'} onPress={() => setStatusFilter('resolved')} />
        </View>
        {ticketsQuery.loading ? <Text>Загружаем тикеты...</Text> : null}
        {ticketsQuery.error ? (
          <EmptyState
            title="Не удалось загрузить тикеты"
            description={ticketsQuery.error}
            actionLabel="Повторить"
            onAction={() => ticketsQuery.reload()}
          />
        ) : null}

        {!ticketsQuery.loading && !ticketsQuery.error && visibleTickets.length === 0 ? (
          <EmptyState title="Тикетов пока нет" description="Создайте первый тикет, если нужна помощь." />
        ) : null}

        {visibleTickets.map((ticket) => {
          const isActive = ticket.id === selectedTicketId;
          return (
            <View
              key={ticket.id}
              style={{
                borderTopWidth: 1,
                borderTopColor: 'rgba(255,255,255,0.08)',
                paddingVertical: 10,
                gap: 6,
              }}
            >
              <Text style={{ fontWeight: '700' }}>{ticket.subject || 'Без темы'}</Text>
              <Text>Статус: {formatStatusLabel(ticket.status)}</Text>
              <Text>{ticket.updatedAt ? formatDateTime(ticket.updatedAt) : 'Дата не указана'}</Text>
              <Button
                title={isActive ? 'Обновить' : 'Открыть детали'}
                variant={isActive ? 'secondary' : 'ghost'}
                onPress={() => loadDetails(ticket.id)}
              />
            </View>
          );
        })}
      </Card>

      {selectedTicketId ? (
        <Card>
          <Text style={{ fontWeight: '700', fontSize: 16 }}>Детали тикета</Text>
          {detailsLoading ? <Text>Загружаем детали...</Text> : null}
          {!detailsLoading && selectedTicket ? (
            <>
              <Text style={{ fontWeight: '700' }}>{selectedTicket.subject}</Text>
              <Text>Статус: {formatStatusLabel(selectedTicket.status)}</Text>
              {selectedTicket.bookingId ? <Text>Бронь: {selectedTicket.bookingId}</Text> : null}
              <Text>{selectedTicket.message}</Text>
              <Text>Создан: {selectedTicket.createdAt ? formatDateTime(selectedTicket.createdAt) : '-'}</Text>
            </>
          ) : null}
          {!detailsLoading && !selectedTicket ? (
            <>
              <Text>{selectedSummary?.message ?? 'Не удалось загрузить сообщение, попробуйте снова.'}</Text>
              <Button title="Повторить загрузку" variant="secondary" onPress={() => loadDetails(selectedTicketId)} />
            </>
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}
