import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Input } from '../../ui/components/Input';
import { Button } from '../../ui/components/Button';
import { EmptyState } from '../../ui/components/EmptyState';
import { Skeleton } from '../../ui/components/Skeleton';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapItems } from '../../api/mappers/dto';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';

function normalizePlate(value: string) {
  return value.toUpperCase().replace(/\s+/g, ' ').trim();
}

function mapVehicleError(error: unknown) {
  const message = toErrorMessage(error);
  const lower = message.toLowerCase();

  if (lower.includes('plate should not exist') || lower.includes('plateno')) {
    return 'Введите госномер в поле "Госномер" (минимум 3 символа), например 30A123BC.';
  }

  if (lower.includes('make')) {
    return 'Заполните поле "Марка".';
  }

  if (lower.includes('model')) {
    return 'Заполните поле "Модель".';
  }

  if (lower.includes('seats')) {
    return 'Количество мест должно быть от 1 до 8.';
  }

  return message;
}

export function VehiclesScreen() {
  const { show } = useToast();
  const [make, setMake] = useState('Chevrolet');
  const [model, setModel] = useState('Cobalt');
  const [plateNo, setPlateNo] = useState('');
  const [seats, setSeats] = useState('4');

  const vehiclesQuery = useQuery(async () => unwrapItems<any>(await api.vehicles.listMine()), []);

  const seatCount = useMemo(() => {
    const parsed = Number(seats);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [seats]);

  const formError = useMemo(() => {
    if (!make.trim()) return 'Укажите марку автомобиля.';
    if (!model.trim()) return 'Укажите модель автомобиля.';
    if (normalizePlate(plateNo).length < 3) return 'Госномер должен быть минимум 3 символа.';
    if (!Number.isFinite(seatCount) || seatCount < 1 || seatCount > 8) {
      return 'Количество мест должно быть от 1 до 8.';
    }
    return null;
  }, [make, model, plateNo, seatCount]);

  return (
    <Screen>
      <Topbar title="Автомобили" />

      <Card>
        <Text style={{ fontWeight: '700', fontSize: 16 }}>Добавить автомобиль</Text>
        <Text style={{ opacity: 0.75 }}>
          Заполните марку, модель и госномер. После добавления авто можно выбрать при создании поездки.
        </Text>

        <Input
          label="Марка"
          value={make}
          onChangeText={setMake}
          placeholder="Chevrolet"
          autoCapitalize="words"
        />
        <Input
          label="Модель"
          value={model}
          onChangeText={setModel}
          placeholder="Cobalt"
          autoCapitalize="words"
        />
        <Input
          label="Госномер"
          value={plateNo}
          onChangeText={(value) => setPlateNo(normalizePlate(value))}
          placeholder="30A123BC"
          autoCapitalize="characters"
        />
        <Input
          label="Места"
          value={seats}
          onChangeText={setSeats}
          keyboardType="number-pad"
          placeholder="4"
        />

        {formError ? <Text style={{ color: '#ef4444', fontSize: 12 }}>{formError}</Text> : null}

        <Button
          title="Добавить авто"
          disabled={Boolean(formError)}
          onPress={async () => {
            try {
              await api.vehicles.create({
                make: make.trim(),
                model: model.trim(),
                plateNo: normalizePlate(plateNo),
                seats: seatCount,
              });
              setMake('Chevrolet');
              setModel('Cobalt');
              setPlateNo('');
              setSeats('4');
              show({ title: 'Автомобиль добавлен', tone: 'success' });
              await vehiclesQuery.reload();
            } catch (error) {
              show({ title: mapVehicleError(error), tone: 'danger' });
            }
          }}
        />
      </Card>

      {vehiclesQuery.loading ? (
        <Card>
          <Skeleton height={16} />
          <Skeleton height={16} />
        </Card>
      ) : null}

      {vehiclesQuery.error ? (
        <Card>
          <EmptyState
            title="Не удалось загрузить автомобили"
            description={vehiclesQuery.error}
            actionLabel="Повторить"
            onAction={() => vehiclesQuery.reload()}
          />
        </Card>
      ) : null}

      {(vehiclesQuery.data ?? []).map((vehicle) => (
        <Card key={String(vehicle.id)}>
          <Text style={{ fontWeight: '700' }}>
            {[vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Автомобиль'}
          </Text>
          <Text>Госномер: {vehicle.plateNo ?? vehicle.plate ?? vehicle.plateNumber ?? '-'}</Text>
          <Text>Места: {vehicle.seats ?? '-'}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              title="Удалить"
              variant="destructive"
              onPress={async () => {
                try {
                  await api.vehicles.remove(String(vehicle.id));
                  show({ title: 'Автомобиль удален', tone: 'success' });
                  await vehiclesQuery.reload();
                } catch (error) {
                  show({ title: toErrorMessage(error), tone: 'danger' });
                }
              }}
            />
          </View>
        </Card>
      ))}

      {!vehiclesQuery.loading && !vehiclesQuery.error && !(vehiclesQuery.data ?? []).length ? (
        <Card>
          <EmptyState
            title="Нет добавленных авто"
            description="Добавьте автомобиль, чтобы создавать поездки."
          />
        </Card>
      ) : null}
    </Screen>
  );
}
