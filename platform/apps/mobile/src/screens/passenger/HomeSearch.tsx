import { useState } from 'react';
import { Text, View } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Input } from '../../ui/components/Input';
import { Button } from '../../ui/components/Button';
import { Chip } from '../../ui/components/Chip';
import { api } from '../../api/client';
import { useQuery } from '../../api/hooks/useQuery';
import { unwrapItems } from '../../api/mappers/dto';
import { EmptyState } from '../../ui/components/EmptyState';
import { getCached, setCached } from '../../core/cache/simple-cache';

type City = { id: string; name: string };

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

  const cityChips = citiesQuery.data ?? [];

  return (
    <Screen>
      <Topbar title="Where to?" />
      <Card>
        <Input label="From city" value={fromCityId} onChangeText={setFromCityId} placeholder="City id" />
        <Input label="To city" value={toCityId} onChangeText={setToCityId} placeholder="City id" />
        <Input label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        <Input label="Seats" value={seats} onChangeText={setSeats} keyboardType="number-pad" />

        <Button
          title="Search trips"
          onPress={() =>
            navigation.navigate('SearchResults', {
              fromCityId,
              toCityId,
              date,
              seats: Number(seats) || 1,
            })
          }
        />
      </Card>

      <Card>
        <Text style={{ fontWeight: '700' }}>Quick cities</Text>
        {cityChips.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {cityChips.slice(0, 8).map((city) => (
              <Chip key={city.id} label={`${city.name} (${city.id.slice(0, 4)})`} />
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
