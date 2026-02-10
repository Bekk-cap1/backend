import { useEffect, useMemo, useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Card } from '../../ui/components/Card';
import { Input } from '../../ui/components/Input';
import { Button } from '../../ui/components/Button';
import { Topbar } from '../../ui/components/Topbar';
import { SeatPicker } from '../../ui/components/SeatPicker';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';
import { unwrapPayload } from '../../api/mappers/dto';
import { createRequestWithQueue } from '../../api/critical-actions';

const toOptionalNumber = (value: string): number | undefined => {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function CreateRequestScreen({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) {
  const tripId = String(route.params?.tripId ?? '');
  const { show } = useToast();

  const [seats, setSeats] = useState('1');
  const [price, setPrice] = useState('45000');
  const [message, setMessage] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [pickupLat, setPickupLat] = useState('');
  const [pickupLon, setPickupLon] = useState('');
  const [dropoffLat, setDropoffLat] = useState('');
  const [dropoffLon, setDropoffLon] = useState('');
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const seatsRequired = useMemo(() => Math.max(1, Number(seats) || 1), [seats]);

  useEffect(() => {
    setSelectedSeats((prev) => prev.slice(0, seatsRequired));
  }, [seatsRequired]);

  const canSubmit = useMemo(
    () =>
      Number(seats) > 0 &&
      Number(price) > 0 &&
      selectedSeats.length === seatsRequired,
    [price, seats, selectedSeats.length, seatsRequired],
  );

  const submit = async () => {
    setLoading(true);
    try {
      const created = await createRequestWithQueue({
        tripId,
        seats: Number(seats),
        price: Number(price),
        currency: 'UZS',
        message,
        seatNumbers: selectedSeats,
        pickupAddress,
        dropoffAddress,
        pickupLat: toOptionalNumber(pickupLat),
        pickupLon: toOptionalNumber(pickupLon),
        dropoffLat: toOptionalNumber(dropoffLat),
        dropoffLon: toOptionalNumber(dropoffLon),
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

        <Input
          label="Seats"
          value={seats}
          onChangeText={setSeats}
          keyboardType="number-pad"
        />

        <SeatPicker
          seatsRequired={seatsRequired}
          selectedSeats={selectedSeats}
          onChange={setSelectedSeats}
        />

        <Input
          label="Offer price"
          value={price}
          onChangeText={setPrice}
          keyboardType="number-pad"
        />
        <Input
          label="Pickup address"
          value={pickupAddress}
          onChangeText={setPickupAddress}
          placeholder="Optional, e.g. Chilanzar metro"
        />
        <Input
          label="Dropoff address"
          value={dropoffAddress}
          onChangeText={setDropoffAddress}
          placeholder="Optional destination"
        />
        <Input
          label="Pickup lat (optional)"
          value={pickupLat}
          onChangeText={setPickupLat}
          keyboardType="decimal-pad"
        />
        <Input
          label="Pickup lon (optional)"
          value={pickupLon}
          onChangeText={setPickupLon}
          keyboardType="decimal-pad"
        />
        <Input
          label="Dropoff lat (optional)"
          value={dropoffLat}
          onChangeText={setDropoffLat}
          keyboardType="decimal-pad"
        />
        <Input
          label="Dropoff lon (optional)"
          value={dropoffLon}
          onChangeText={setDropoffLon}
          keyboardType="decimal-pad"
        />
        <Input
          label="Comment"
          value={message}
          onChangeText={setMessage}
          placeholder="Optional"
        />

        <Button
          title="Send request"
          loading={loading}
          onPress={submit}
          disabled={!canSubmit}
        />
      </Card>
    </Screen>
  );
}
