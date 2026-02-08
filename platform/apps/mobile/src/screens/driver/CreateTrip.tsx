import { useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Input } from '../../ui/components/Input';
import { Button } from '../../ui/components/Button';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';
import { api } from '../../api/client';
import { unwrapPayload } from '../../api/mappers/dto';

export function CreateTripScreen({ navigation }: { navigation: any }) {
  const { show } = useToast();
  const [fromCityId, setFromCityId] = useState('');
  const [toCityId, setToCityId] = useState('');
  const [price, setPrice] = useState('45000');
  const [departureAt, setDepartureAt] = useState(new Date().toISOString());
  const [seatsTotal, setSeatsTotal] = useState('4');

  return (
    <Screen>
      <Topbar title="Create trip" />
      <Card>
        <Input label="From city id" value={fromCityId} onChangeText={setFromCityId} />
        <Input label="To city id" value={toCityId} onChangeText={setToCityId} />
        <Input label="Departure ISO" value={departureAt} onChangeText={setDepartureAt} />
        <Input label="Seats" value={seatsTotal} onChangeText={setSeatsTotal} keyboardType="number-pad" />
        <Input label="Price" value={price} onChangeText={setPrice} keyboardType="number-pad" />
        <Button
          title="Save draft"
          onPress={async () => {
            try {
              const created = unwrapPayload<any>(
                await api.trips.create({
                  fromCityId,
                  toCityId,
                  departureAt,
                  seatsTotal: Number(seatsTotal) || 4,
                  price: Number(price) || 0,
                  currency: 'UZS',
                }),
              );
              show({ title: 'Trip created', tone: 'success' });
              navigation.navigate('DriverTabs');
              navigation.navigate('ActiveTrip', { tripId: created.id });
            } catch (error) {
              show({ title: toErrorMessage(error), tone: 'danger' });
            }
          }}
        />
      </Card>
    </Screen>
  );
}
