import { useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Input } from '../../ui/components/Input';
import { Button } from '../../ui/components/Button';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapItems } from '../../api/mappers/dto';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';

export function PassengerSupportScreen() {
  const { show } = useToast();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const ticketsQuery = useQuery(async () => unwrapItems<any>(await api.tickets.my()), []);

  return (
    <Screen>
      <Topbar title="Support" />
      <Card>
        <Input label="Subject" value={subject} onChangeText={setSubject} />
        <Input label="Message" value={message} onChangeText={setMessage} multiline style={{ minHeight: 96 }} />
        <Button
          title="Create support ticket"
          onPress={async () => {
            try {
              await api.tickets.create({ subject, message });
              setSubject('');
              setMessage('');
              show({ title: 'Ticket created', tone: 'success' });
              await ticketsQuery.reload();
            } catch (error) {
              show({ title: toErrorMessage(error), tone: 'danger' });
            }
          }}
        />
      </Card>
      {(ticketsQuery.data ?? []).map((ticket) => (
        <Card key={String(ticket.id)}>
          <Text style={{ fontWeight: '700' }}>{ticket.subject}</Text>
          <Text>{ticket.status}</Text>
        </Card>
      ))}
    </Screen>
  );
}
