import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import * as Location from 'expo-location';
import { Screen } from '../../ui/components/Screen';
import { Card } from '../../ui/components/Card';
import { Input } from '../../ui/components/Input';
import { Button } from '../../ui/components/Button';
import { Topbar } from '../../ui/components/Topbar';
import { SeatPicker } from '../../ui/components/SeatPicker';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';
import { unwrapPayload } from '../../api/mappers/dto';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import {
  createRequestWithQueue,
  getOfflineQueueSize,
} from '../../api/critical-actions';
import { MapView } from '../../ui/components/Map/MapView';
import {
  TripProgressTimeline,
  type TripProgressStep,
} from '../../ui/components/TripProgressTimeline';
import type { MapCoordinate, MapMarker } from '../../ui/components/Map/types';

const seatPreferences = [
  { key: 'any', label: 'Без предпочтений' },
  { key: 'front', label: 'Передние места' },
  { key: 'back', label: 'Задние места' },
  { key: 'window', label: 'У окна' },
  { key: 'aisle', label: 'У прохода' },
] as const;

type SeatPreference = (typeof seatPreferences)[number]['key'];

function formatPoint(point: MapCoordinate | null) {
  if (!point) return 'не выбрано';
  return `${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`;
}

function composeRequestMessage(message: string, seatPreference: SeatPreference) {
  const trimmed = message.trim();
  if (seatPreference === 'any') return trimmed || undefined;

  const preferenceLabel = seatPreferences.find((item) => item.key === seatPreference)?.label;
  const suffix = `Предпочтение по месту: ${preferenceLabel ?? seatPreference}`;
  if (!trimmed) return suffix;
  return `${trimmed}\n${suffix}`;
}

export function CreateRequestScreen({ route, navigation }: { route: any; navigation: any }) {
  const tripId = String(route.params?.tripId ?? '');
  const { show } = useToast();

  const [seats, setSeats] = useState('1');
  const [price, setPrice] = useState('45000');
  const [message, setMessage] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [pickupPoint, setPickupPoint] = useState<MapCoordinate | null>(null);
  const [dropoffPoint, setDropoffPoint] = useState<MapCoordinate | null>(null);
  const [activePoint, setActivePoint] = useState<'pickup' | 'dropoff'>('pickup');
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [seatPreference, setSeatPreference] = useState<SeatPreference>('any');
  const [loading, setLoading] = useState(false);

  const seatMapQuery = useQuery(async () => unwrapPayload<any>(await api.trips.getSeatMap(tripId)), [tripId]);
  const offlineQueueQuery = useQuery(async () => getOfflineQueueSize(), []);

  const takenSeats = useMemo<string[]>(
    () =>
      Array.isArray(seatMapQuery.data?.unavailableSeats)
        ? seatMapQuery.data.unavailableSeats
        : Array.isArray(seatMapQuery.data?.takenSeats)
          ? seatMapQuery.data.takenSeats
          : [],
    [seatMapQuery.data],
  );

  const seatsRequired = useMemo(() => Math.max(1, Number(seats) || 1), [seats]);

  useEffect(() => {
    setSelectedSeats((prev) => prev.slice(0, seatsRequired));
  }, [seatsRequired]);

  useEffect(() => {
    if (!takenSeats.length) return;
    setSelectedSeats((prev) => prev.filter((seat) => !takenSeats.includes(seat)).slice(0, seatsRequired));
  }, [takenSeats, seatsRequired]);

  useEffect(() => {
    const selection = route.params?.locationSelection;
    if (!selection || typeof selection !== 'object') return;
    const mode = selection.mode === 'dropoff' ? 'dropoff' : 'pickup';
    const point = selection.point;
    const address = typeof selection.address === 'string' ? selection.address : '';
    if (!point || !Number.isFinite(Number(point.lat)) || !Number.isFinite(Number(point.lon))) {
      return;
    }

    if (mode === 'pickup') {
      setPickupPoint({ lat: Number(point.lat), lon: Number(point.lon) });
      if (address) setPickupAddress(address);
    } else {
      setDropoffPoint({ lat: Number(point.lat), lon: Number(point.lon) });
      if (address) setDropoffAddress(address);
    }
  }, [route.params?.locationSelection]);

  const canSubmit = useMemo(
    () =>
      Number(seats) > 0 &&
      Number(price) > 0 &&
      selectedSeats.length === seatsRequired &&
      !!pickupPoint &&
      !!dropoffPoint,
    [price, seats, selectedSeats.length, seatsRequired, pickupPoint, dropoffPoint],
  );

  const activeHint =
    activePoint === 'pickup'
      ? 'Нажмите на карту, чтобы зафиксировать точку посадки.'
      : 'Нажмите на карту, чтобы зафиксировать точку высадки.';

  const customMarkers = useMemo<MapMarker[]>(() => {
    const markers: MapMarker[] = [];
    if (pickupPoint) {
      markers.push({
        id: 'pickup-point',
        lat: pickupPoint.lat,
        lon: pickupPoint.lon,
        kind: 'pickup',
        title: 'Посадка',
      });
    }
    if (dropoffPoint) {
      markers.push({
        id: 'dropoff-point',
        lat: dropoffPoint.lat,
        lon: dropoffPoint.lon,
        kind: 'dropoff',
        title: 'Высадка',
      });
    }
    return markers;
  }, [pickupPoint, dropoffPoint]);

  const mapCenter = pickupPoint ?? dropoffPoint ?? null;

  const flowSteps = useMemo<TripProgressStep[]>(
    () => [
      {
        id: 'seats',
        label: 'Выбор мест',
        state: selectedSeats.length === seatsRequired ? 'completed' : 'active',
        subtitle: `${selectedSeats.length}/${seatsRequired}`,
      },
      {
        id: 'pickup',
        label: 'Точка посадки',
        state: pickupPoint ? 'completed' : selectedSeats.length === seatsRequired ? 'active' : 'pending',
      },
      {
        id: 'dropoff',
        label: 'Точка высадки',
        state:
          pickupPoint && dropoffPoint
            ? 'completed'
            : pickupPoint
              ? 'active'
              : 'pending',
      },
      {
        id: 'submit',
        label: 'Отправка заявки',
        state: canSubmit ? 'active' : 'pending',
      },
    ],
    [canSubmit, dropoffPoint, pickupPoint, seatsRequired, selectedSeats.length],
  );

  const useCurrentLocation = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        show({ title: 'Доступ к геолокации отклонен', tone: 'danger' });
        return;
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { lat: current.coords.latitude, lon: current.coords.longitude };

      if (activePoint === 'pickup') {
        setPickupPoint(point);
      } else {
        setDropoffPoint(point);
      }

      show({
        title: activePoint === 'pickup' ? 'Точка посадки обновлена' : 'Точка высадки обновлена',
        tone: 'success',
      });
    } catch (error) {
      show({ title: toErrorMessage(error), tone: 'danger' });
    }
  };

  const submit = async () => {
    if (!pickupPoint || !dropoffPoint) {
      show({ title: 'Выберите точку посадки и высадки', tone: 'danger' });
      return;
    }

    setLoading(true);
    try {
      const created = await createRequestWithQueue({
        tripId,
        seats: Number(seats),
        price: Number(price),
        currency: 'UZS',
        message: composeRequestMessage(message, seatPreference),
        seatNumbers: selectedSeats,
        pickupAddress,
        dropoffAddress,
        pickupLat: pickupPoint.lat,
        pickupLon: pickupPoint.lon,
        dropoffLat: dropoffPoint.lat,
        dropoffLon: dropoffPoint.lon,
      });

      if (created.queued) {
        show({ title: 'Нет сети: заявка добавлена в очередь и отправится при восстановлении связи.', tone: 'info' });
        await offlineQueueQuery.reload();
        navigation.goBack();
        return;
      }

      const data = unwrapPayload<any>(created.result);
      const requestId = String(data?.id ?? data?.request?.id ?? '');
      show({ title: 'Заявка отправлена', tone: 'success' });
      await offlineQueueQuery.reload();

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
      <Topbar title="Создание заявки" />

      <Card>
        <Text style={{ fontWeight: '700' }}>Шаги заявки</Text>
        <TripProgressTimeline steps={flowSteps} />
        <Text style={{ opacity: 0.75 }}>
          Офлайн-очередь: {offlineQueueQuery.loading ? 'загрузка...' : String(offlineQueueQuery.data ?? 0)}
        </Text>
      </Card>

      <Card>
        <Text style={{ fontWeight: '700' }}>Места и предпочтения</Text>
        <Input label="Количество мест" value={seats} onChangeText={setSeats} keyboardType="number-pad" />

        {seatMapQuery.loading ? <Text>Загружаем схему мест...</Text> : null}
        {seatMapQuery.error ? (
          <Text>
            Схема мест недоступна: {seatMapQuery.error}.{' '}
            <Text style={{ textDecorationLine: 'underline' }} onPress={() => seatMapQuery.reload()}>
              Повторить
            </Text>
          </Text>
        ) : null}
        {!seatMapQuery.loading ? (
          <Text>
            Всего мест: {seatMapQuery.data?.seatsTotal ?? 'n/a'} | Свободно: {seatMapQuery.data?.seatsAvailable ?? 'n/a'}
          </Text>
        ) : null}

        <SeatPicker
          seatsRequired={seatsRequired}
          selectedSeats={selectedSeats}
          takenSeats={takenSeats}
          onChange={setSelectedSeats}
        />
        <Text>Выбрано мест: {selectedSeats.length ? selectedSeats.join(', ') : '-'}</Text>

        <Text style={{ fontWeight: '600' }}>Предпочтение по месту</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {seatPreferences.map((item) => (
            <Button
              key={item.key}
              title={item.label}
              variant={seatPreference === item.key ? 'primary' : 'ghost'}
              onPress={() => setSeatPreference(item.key)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={{ fontWeight: '700' }}>Посадка и высадка</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            title="Посадка"
            variant={activePoint === 'pickup' ? 'primary' : 'secondary'}
            onPress={() => setActivePoint('pickup')}
          />
          <Button
            title="Высадка"
            variant={activePoint === 'dropoff' ? 'primary' : 'secondary'}
            onPress={() => setActivePoint('dropoff')}
          />
          <Button title="Моя геопозиция" variant="ghost" onPress={useCurrentLocation} />
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            title="Выбрать посадку"
            variant="secondary"
            onPress={() =>
              navigation.navigate('LocationPicker', {
                mode: 'pickup',
                currentPoint: pickupPoint,
                currentAddress: pickupAddress,
              })
            }
          />
          <Button
            title="Выбрать высадку"
            variant="secondary"
            onPress={() =>
              navigation.navigate('LocationPicker', {
                mode: 'dropoff',
                currentPoint: dropoffPoint,
                currentAddress: dropoffAddress,
              })
            }
          />
        </View>

        <Text>{activeHint}</Text>
        <Text>Адрес посадки: {pickupAddress || 'не указан'}</Text>
        <Text>Адрес высадки: {dropoffAddress || 'не указан'}</Text>
        <Text>Координаты посадки: {formatPoint(pickupPoint)}</Text>
        <Text>Координаты высадки: {formatPoint(dropoffPoint)}</Text>

        <MapView
          center={mapCenter}
          customMarkers={customMarkers}
          onMapPress={(point) => {
            if (activePoint === 'pickup') {
              setPickupPoint(point);
              return;
            }
            setDropoffPoint(point);
          }}
        />
      </Card>

      <Card>
        <Input label="Ваша цена" value={price} onChangeText={setPrice} keyboardType="number-pad" />
        <Input label="Комментарий" value={message} onChangeText={setMessage} placeholder="По желанию" />
        <Button title="Отправить заявку" loading={loading} onPress={submit} disabled={!canSubmit} />
      </Card>
    </Screen>
  );
}
