import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import * as Location from 'expo-location';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Input } from '../../ui/components/Input';
import { Button } from '../../ui/components/Button';
import { Select } from '../../ui/components/Select';
import { EmptyState } from '../../ui/components/EmptyState';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';
import { api } from '../../api/client';
import { useQuery } from '../../api/hooks/useQuery';
import { unwrapItems, unwrapPayload } from '../../api/mappers/dto';

type City = { id: string; name: string; lat?: number | null; lon?: number | null };
type Vehicle = {
  id: string;
  make?: string;
  model?: string;
  plateNo?: string;
  plate?: string;
  plateNumber?: string;
};

function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

function findClosestCity(cities: City[], lat: number, lon: number) {
  let best: { city: City; km: number } | null = null;
  for (const city of cities) {
    if (city.lat == null || city.lon == null) continue;
    const km = distanceKm(lat, lon, city.lat, city.lon);
    if (!best || km < best.km) best = { city, km };
  }
  return best;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toLocalDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function roundToNextQuarter(date: Date) {
  const clone = new Date(date);
  clone.setSeconds(0, 0);
  const minute = clone.getMinutes();
  const nextQuarter = Math.ceil(minute / 15) * 15;
  if (nextQuarter === 60) {
    clone.setHours(clone.getHours() + 1, 0, 0, 0);
  } else {
    clone.setMinutes(nextQuarter, 0, 0);
  }
  return clone;
}

function toTimeSlot(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function composeDepartureIso(date: string, time: string) {
  if (!date || !time) return null;
  const [year, month, day] = date.split('-').map((item) => Number(item));
  const [hour, minute] = time.split(':').map((item) => Number(item));
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null;
  }

  const localDate = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (Number.isNaN(localDate.getTime())) return null;
  return localDate.toISOString();
}

const TIME_OPTIONS = Array.from({ length: 96 }, (_, index) => {
  const hour = Math.floor(index / 4);
  const minute = (index % 4) * 15;
  const value = `${pad(hour)}:${pad(minute)}`;
  return { value, label: value };
});

export function CreateTripScreen({ navigation }: { navigation: any }) {
  const { show } = useToast();

  const initialDate = roundToNextQuarter(new Date(Date.now() + 60 * 60 * 1000));
  const [fromCityId, setFromCityId] = useState('');
  const [toCityId, setToCityId] = useState('');
  const [price, setPrice] = useState('45000');
  const [departureDate, setDepartureDate] = useState(toLocalDate(initialDate));
  const [departureTime, setDepartureTime] = useState(toTimeSlot(initialDate));
  const [seatsTotal, setSeatsTotal] = useState('4');
  const [vehicleId, setVehicleId] = useState('');
  const [fromLat, setFromLat] = useState('');
  const [fromLon, setFromLon] = useState('');
  const [toLat, setToLat] = useState('');
  const [toLon, setToLon] = useState('');

  const departureAtIso = useMemo(
    () => composeDepartureIso(departureDate, departureTime),
    [departureDate, departureTime],
  );

  const citiesQuery = useQuery(async () => {
    const res = await api.cities.list();
    const payload = unwrapPayload<{ items?: City[] }>(res);
    return payload.items ?? [];
  }, []);
  const verificationQuery = useQuery(async () => unwrapPayload<any>(await api.drivers.me()), []);
  const vehiclesQuery = useQuery(
    async () => unwrapItems<Vehicle>(await api.vehicles.listMine()),
    [],
  );
  const verificationStatus = String(verificationQuery.data?.status ?? 'draft').toLowerCase();
  const isVerified = verificationStatus === 'verified';

  const cityOptions = useMemo(
    () =>
      (citiesQuery.data ?? []).map((city) => ({
        value: city.id,
        label: city.name,
      })),
    [citiesQuery.data],
  );
  const vehicleOptions = useMemo(
    () =>
      (vehiclesQuery.data ?? []).map((vehicle) => {
        const plate = vehicle.plateNo ?? vehicle.plate ?? vehicle.plateNumber ?? '';
        const name = [vehicle.make, vehicle.model].filter(Boolean).join(' ').trim();
        return {
          value: String(vehicle.id),
          label: name || `Авто ${plate || String(vehicle.id).slice(0, 6)}`,
          hint: plate || undefined,
        };
      }),
    [vehiclesQuery.data],
  );

  useEffect(() => {
    if (!cityOptions.length) return;
    if (!fromCityId) setFromCityId(cityOptions[0].value);
    if (!toCityId) setToCityId(cityOptions[1]?.value ?? cityOptions[0].value);
  }, [cityOptions, fromCityId, toCityId]);
  useEffect(() => {
    if (!vehicleOptions.length) return;
    if (!vehicleId) setVehicleId(vehicleOptions[0].value);
  }, [vehicleId, vehicleOptions]);

  const canSubmit =
    Boolean(
      vehicleId &&
      fromCityId &&
        toCityId &&
        Number(price) > 0 &&
        Number(seatsTotal) > 0 &&
        departureAtIso,
    ) &&
    fromCityId !== toCityId &&
    isVerified;

  const applyCurrentLocation = async (target: 'from' | 'to') => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        show({ title: 'Нет доступа к геолокации', tone: 'danger' });
        return;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const nearest = findClosestCity(citiesQuery.data ?? [], lat, lon);

      if (!nearest) {
        show({ title: 'Не удалось определить ближайший город', tone: 'danger' });
        return;
      }

      if (target === 'from') {
        setFromCityId(nearest.city.id);
        setFromLat(String(lat));
        setFromLon(String(lon));
      } else {
        setToCityId(nearest.city.id);
        setToLat(String(lat));
        setToLon(String(lon));
      }

      show({
        title: `${target === 'from' ? 'Город отправления' : 'Город прибытия'}: ${nearest.city.name}`,
        tone: 'success',
      });
    } catch (error) {
      show({ title: toErrorMessage(error), tone: 'danger' });
    }
  };

  return (
    <Screen>
      <Topbar title="Создание поездки" />
      {!isVerified ? (
        <Card>
          <Text style={{ fontWeight: '700' }}>Требуется верификация водителя</Text>
          <Text style={{ opacity: 0.8 }}>
            Статус: {verificationStatus}. Завершите KYC, чтобы публиковать поездки.
          </Text>
          <Button
            title="Открыть верификацию"
            onPress={() => navigation.navigate('DriverVerification')}
          />
        </Card>
      ) : null}
      <Card>
        {citiesQuery.loading ? <Text style={{ opacity: 0.8 }}>Загружаем города...</Text> : null}

        {citiesQuery.error ? (
          <EmptyState
            title="Не удалось загрузить города"
            description={citiesQuery.error}
            actionLabel="Повторить"
            onAction={() => citiesQuery.reload()}
          />
        ) : null}

        {!citiesQuery.error ? (
          <>
            <Select
              label="Город отправления"
              value={fromCityId}
              options={cityOptions}
              onChange={setFromCityId}
              placeholder="Выберите город"
            />
            <Button
              title="Определить по геолокации (откуда)"
              variant="secondary"
              onPress={() => applyCurrentLocation('from')}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Широта (откуда)"
                  value={fromLat}
                  onChangeText={setFromLat}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Долгота (откуда)"
                  value={fromLon}
                  onChangeText={setFromLon}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <Select
              label="Город прибытия"
              value={toCityId}
              options={cityOptions}
              onChange={setToCityId}
              placeholder="Выберите город"
            />
            <Button
              title="Определить по геолокации (куда)"
              variant="secondary"
              onPress={() => applyCurrentLocation('to')}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Широта (куда)"
                  value={toLat}
                  onChangeText={setToLat}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Долгота (куда)"
                  value={toLon}
                  onChangeText={setToLon}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </>
        ) : null}

        {vehiclesQuery.loading ? <Text style={{ opacity: 0.8 }}>Загружаем автомобили...</Text> : null}
        {vehiclesQuery.error ? (
          <EmptyState
            title="Не удалось загрузить автомобили"
            description={vehiclesQuery.error}
            actionLabel="Открыть авто"
            onAction={() => navigation.navigate('Vehicles')}
          />
        ) : null}
        {!vehiclesQuery.error ? (
          <Select
            label="Автомобиль"
            value={vehicleId}
            options={vehicleOptions}
            onChange={setVehicleId}
            placeholder="Выберите автомобиль"
            disabled={!vehicleOptions.length}
          />
        ) : null}
        {!vehiclesQuery.loading && !vehiclesQuery.error && !vehicleOptions.length ? (
          <EmptyState
            title="Нет добавленного авто"
            description="Сначала добавьте автомобиль в профиле водителя."
            actionLabel="Добавить авто"
            onAction={() => navigation.navigate('Vehicles')}
          />
        ) : null}

        <Input
          label="Дата отправления"
          value={departureDate}
          onChangeText={setDepartureDate}
          placeholder="YYYY-MM-DD"
        />
        <Select
          label="Время отправления"
          value={departureTime}
          options={TIME_OPTIONS}
          onChange={setDepartureTime}
          placeholder="Выберите время"
        />
        {departureAtIso ? (
          <Text style={{ opacity: 0.75 }}>UTC: {departureAtIso}</Text>
        ) : (
          <Text style={{ color: '#ef4444', fontSize: 12 }}>
            Укажите корректные дату и время отправления.
          </Text>
        )}

        <Input
          label="Места"
          value={seatsTotal}
          onChangeText={setSeatsTotal}
          keyboardType="number-pad"
        />
        <Input
          label="Цена"
          value={price}
          onChangeText={setPrice}
          keyboardType="number-pad"
        />
        <Button
          title={isVerified ? 'Сохранить поездку' : 'Нужна верификация'}
          disabled={!canSubmit}
          onPress={async () => {
            try {
              const created = unwrapPayload<any>(
                await api.trips.create({
                  vehicleId,
                  fromCityId,
                  toCityId,
                  departureAt: departureAtIso,
                  seatsTotal: Number(seatsTotal) || 4,
                  price: Number(price) || 0,
                  currency: 'UZS',
                  ...(fromLat.trim() && fromLon.trim()
                    ? {
                        fromLat: Number(fromLat),
                        fromLon: Number(fromLon),
                      }
                    : {}),
                  ...(toLat.trim() && toLon.trim()
                    ? {
                        toLat: Number(toLat),
                        toLon: Number(toLon),
                      }
                    : {}),
                }),
              );
              show({ title: 'Поездка успешно создана', tone: 'success' });
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
