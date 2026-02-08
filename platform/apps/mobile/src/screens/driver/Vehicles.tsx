import { useState } from 'react';
import { Text, View } from 'react-native';
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

export function VehiclesScreen() {
  const { show } = useToast();
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  const [seats, setSeats] = useState('4');

  const vehiclesQuery = useQuery(async () => unwrapItems<any>(await api.vehicles.listMine()), []);

  return (
    <Screen>
      <Topbar title="Vehicles" />
      <Card>
        <Input label="Model" value={model} onChangeText={setModel} />
        <Input label="Plate" value={plate} onChangeText={setPlate} />
        <Input label="Seats" value={seats} onChangeText={setSeats} keyboardType="number-pad" />
        <Button
          title="Add vehicle"
          onPress={async () => {
            try {
              await api.vehicles.create({ model, plate, seats: Number(seats) || 4 });
              setModel('');
              setPlate('');
              show({ title: 'Vehicle created', tone: 'success' });
              await vehiclesQuery.reload();
            } catch (error) {
              show({ title: toErrorMessage(error), tone: 'danger' });
            }
          }}
        />
      </Card>

      {(vehiclesQuery.data ?? []).map((vehicle) => (
        <Card key={String(vehicle.id)}>
          <Text style={{ fontWeight: '700' }}>{vehicle.model ?? vehicle.name ?? 'Vehicle'}</Text>
          <Text>Plate: {vehicle.plate ?? vehicle.plateNumber ?? '-'}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              title="Delete"
              variant="destructive"
              onPress={async () => {
                try {
                  await api.vehicles.remove(String(vehicle.id));
                  show({ title: 'Deleted', tone: 'success' });
                  await vehiclesQuery.reload();
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
