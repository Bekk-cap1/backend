import { useMemo, useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Card } from '../../ui/components/Card';
import { Input } from '../../ui/components/Input';
import { Button } from '../../ui/components/Button';
import { Topbar } from '../../ui/components/Topbar';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';
import { unwrapPayload } from '../../api/mappers/dto';
import { createRequestWithQueue } from '../../api/critical-actions';

export function CreateRequestScreen({ route, navigation }: { route: any; navigation: any }) {
  const tripId = String(route.params?.tripId ?? '');
  const { show } = useToast();

  const [seats, setSeats] = useState('1');
  const [price, setPrice] = useState('45000');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => Number(seats) > 0 && Number(price) > 0, [price, seats]);

  const submit = async () => {
    setLoading(true);
    try {
      const created = await createRequestWithQueue({
        tripId,
        seats: Number(seats),
        price: Number(price),
        currency: 'UZS',
        message,
      });

      if (created.queued) {
        show({ title: 'Offline: request queued and will be retried.', tone: 'info' });
        navigation.goBack();
        return;
      }

      const data = unwrapPayload<any>(created.result);
      const requestId = String(data?.id ?? data?.request?.id ?? '');
      show({ title: 'Request created', tone: 'success' });

      if (requestId) {
        navigation.replace('PassengerNegotiation', { requestId });
      } else {
        navigation.goBack();
      }
    } catch (error) {
      show({ title: toErrorMessage(error), tone: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Topbar title="Create request" />
      <Card>
        <Text>Trip: {tripId}</Text>
        <Input label="Seats" value={seats} onChangeText={setSeats} keyboardType="number-pad" />
        <Input label="Offer price" value={price} onChangeText={setPrice} keyboardType="number-pad" />
        <Input label="Comment" value={message} onChangeText={setMessage} placeholder="Optional" />
        <Button title="Send request" loading={loading} onPress={submit} disabled={!canSubmit} />
      </Card>
    </Screen>
  );
}
