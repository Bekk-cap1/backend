import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { Chip } from '../../ui/components/Chip';
import { EmptyState } from '../../ui/components/EmptyState';
import { DockPanel } from '../../ui/components/primitives/DockPanel';
import { RouteRibbon } from '../../ui/components/route-ribbon/RouteRibbon';
import { api } from '../../api/client';
import { useQuery } from '../../api/hooks/useQuery';
import { unwrapItems } from '../../api/mappers/dto';
import { getCached, setCached } from '../../core/cache/simple-cache';

type City = { id: string; name: string; countryCode?: string };

export function HomeSearchScreen({ navigation }: { navigation: any }) {
  const [fromCityId, setFromCityId] = useState('');
  const [toCityId, setToCityId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [seats, setSeats] = useState('1');

  const citiesQuery = useQuery(async () => {
    const cacheKey = 'cities:list:50';
    const cached = await getCached<City[]>(cacheKey);
    if (cached && cached.length) return cached;

    const res = await api.cities.list({ limit: 50 });
    const items = unwrapItems<City>(res);
    await setCached(cacheKey, items, 5 * 60 * 1000);
    return items;
  }, []);

  const cityOptions = useMemo(
    () =>
      (citiesQuery.data ?? []).map((city) => ({
        value: city.id,
        label: city.name,
        hint: city.countryCode,
      })),
    [citiesQuery.data],
  );

  useEffect(() => {
    if (!cityOptions.length) return;
    if (!fromCityId) setFromCityId(cityOptions[0].value);
    if (!toCityId) setToCityId(cityOptions[1]?.value ?? cityOptions[0].value);
  }, [cityOptions, fromCityId, toCityId]);

  const fromCity = useMemo(
    () => (citiesQuery.data ?? []).find((city) => city.id === fromCityId),
    [citiesQuery.data, fromCityId],
  );
  const toCity = useMemo(
    () => (citiesQuery.data ?? []).find((city) => city.id === toCityId),
    [citiesQuery.data, toCityId],
  );

  const fromLabel = fromCity?.name ?? 'From';
  const toLabel = toCity?.name ?? 'To';
  const canSearch = !!fromCityId && !!toCityId && Number(seats) > 0;

  return (
    <Screen>
      <Topbar title="Intercity Pulse" />

      <Card>
        <Text style={{ fontWeight: '700', fontSize: 18 }}>Explore routes</Text>
        <Text style={{ opacity: 0.75 }}>
          Build your trip in one ribbon: route, date, seats, then jump to live offers.
        </Text>

        <RouteRibbon
          from={fromCityId}
          to={toCityId}
          date={date}
          seats={seats}
          cityOptions={cityOptions}
          onFromChange={setFromCityId}
          onToChange={setToCityId}
          onDateChange={setDate}
          onSeatsChange={setSeats}
          onSwap={() => {
            const prevFrom = fromCityId;
            setFromCityId(toCityId);
            setToCityId(prevFrom);
          }}
        />
      </Card>

      <DockPanel>
        <Text style={{ fontWeight: '700' }}>Pulse Dock</Text>
        <Text>
          {fromLabel} -&gt; {toLabel} • {date} • {seats} seat(s)
        </Text>
        <Button
          title="Search trips"
          disabled={!canSearch}
          onPress={() =>
            navigation.navigate('SearchResults', {
              fromCityId,
              toCityId,
              fromCityName: fromCity?.name,
              toCityName: toCity?.name,
              date,
              seats: Number(seats) || 1,
            })
          }
        />
      </DockPanel>

      <Card>
        <Text style={{ fontWeight: '700' }}>Popular cities</Text>
        {cityOptions.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {cityOptions.slice(0, 12).map((city) => (
              <Chip
                key={city.value}
                label={city.label}
                onPress={() => {
                  if (!fromCityId) {
                    setFromCityId(city.value);
                    return;
                  }
                  if (!toCityId || toCityId === fromCityId) {
                    setToCityId(city.value);
                    return;
                  }
                  setFromCityId(city.value);
                }}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            title="No cities loaded"
            description={citiesQuery.error ?? 'Start backend and retry'}
            actionLabel="Retry"
            onAction={() => citiesQuery.reload()}
          />
        )}
      </Card>
    </Screen>
  );
}

