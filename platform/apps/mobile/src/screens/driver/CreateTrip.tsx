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
import { unwrapPayload } from '../../api/mappers/dto';

type City = { id: string; name: string; lat?: number | null; lon?: number | null };

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

export function CreateTripScreen({ navigation }: { navigation: any }) {
  const { show } = useToast();
  const [fromCityId, setFromCityId] = useState('');
  const [toCityId, setToCityId] = useState('');
  const [price, setPrice] = useState('45000');
  const [departureAt, setDepartureAt] = useState(new Date(Date.now() + 60 * 60 * 1000).toISOString());
  const [seatsTotal, setSeatsTotal] = useState('4');
  const [fromLat, setFromLat] = useState('');
  const [fromLon, setFromLon] = useState('');
  const [toLat, setToLat] = useState('');
  const [toLon, setToLon] = useState('');

  const citiesQuery = useQuery(async () => {
    const res = await api.cities.list({ limit: 100 });
    const payload = unwrapPayload<{ items?: City[] }>(res);
    return payload.items ?? [];
  }, []);

  const cityOptions = useMemo(
    () =>
      (citiesQuery.data ?? []).map((city) => ({
        value: city.id,
        label: city.name,
      })),
    [citiesQuery.data],
  );

  useEffect(() => {
    if (!cityOptions.length) return;
    if (!fromCityId) setFromCityId(cityOptions[0].value);
    if (!toCityId) setToCityId(cityOptions[1]?.value ?? cityOptions[0].value);
  }, [cityOptions, fromCityId, toCityId]);

  const canSubmit =
    Boolean(fromCityId && toCityId && Number(price) > 0 && Number(seatsTotal) > 0) &&
    fromCityId !== toCityId;

  const applyCurrentLocation = async (target: 'from' | 'to') => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        show({ title: 'Location permission is required', tone: 'danger' });
        return;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const nearest = findClosestCity(citiesQuery.data ?? [], lat, lon);

      if (!nearest) {
        show({ title: 'No city with configured coordinates found', tone: 'danger' });
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
        title: `${target === 'from' ? 'From' : 'To'} point set near ${nearest.city.name} (${nearest.km.toFixed(1)} km)`,
        tone: 'success',
      });
    } catch (error) {
      show({ title: toErrorMessage(error), tone: 'danger' });
    }
  };

  return (
    <Screen>
      <Topbar title="Create trip" />
      <Card>
        {citiesQuery.loading ? (
          <Text style={{ opacity: 0.8 }}>Loading cities...</Text>
        ) : null}

        {citiesQuery.error ? (
          <EmptyState
            title="Failed to load cities"
            description={citiesQuery.error}
            actionLabel="Retry"
            onAction={() => citiesQuery.reload()}
          />
        ) : null}

        {!citiesQuery.error ? (
          <>
            <Select
              label="From city"
              value={fromCityId}
              options={cityOptions}
              onChange={setFromCityId}
              placeholder="Select departure city"
            />
            <Button
              title="Use current location for departure"
              variant="secondary"
              onPress={() => applyCurrentLocation('from')}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="From lat (optional)"
                  value={fromLat}
                  onChangeText={setFromLat}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="From lon (optional)"
                  value={fromLon}
                  onChangeText={setFromLon}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <Select
              label="To city"
              value={toCityId}
              options={cityOptions}
              onChange={setToCityId}
              placeholder="Select destination city"
            />
            <Button
              title="Use current location for destination"
              variant="secondary"
              onPress={() => applyCurrentLocation('to')}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="To lat (optional)"
                  value={toLat}
                  onChangeText={setToLat}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="To lon (optional)"
                  value={toLon}
                  onChangeText={setToLon}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </>
        ) : null}

        <Input
          label="Departure ISO"
          value={departureAt}
          onChangeText={setDepartureAt}
        />
        <Input
          label="Seats"
          value={seatsTotal}
          onChangeText={setSeatsTotal}
          keyboardType="number-pad"
        />
        <Input
          label="Price"
          value={price}
          onChangeText={setPrice}
          keyboardType="number-pad"
        />
        <Button
          title="Save draft"
          disabled={!canSubmit}
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

