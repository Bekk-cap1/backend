import { useEffect, useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { Chip } from '../../ui/components/Chip';
import { Select } from '../../ui/components/Select';
import { EmptyState } from '../../ui/components/EmptyState';
import { Skeleton } from '../../ui/components/Skeleton';
import { Badge } from '../../ui/components/Badge';
import { DockPanel } from '../../ui/components/primitives/DockPanel';
import { RouteRibbon } from '../../ui/components/route-ribbon/RouteRibbon';
import { api } from '../../api/client';
import { useQuery } from '../../api/hooks/useQuery';
import { unwrapItems } from '../../api/mappers/dto';
import { getCached, setCached } from '../../core/cache/simple-cache';
import { formatDateTime, formatMoney } from '../../core/format';

type City = { id: string; name: string; countryCode?: string };
type Trip = {
  id: string;
  fromCity?: { name?: string; id?: string };
  toCity?: { name?: string; id?: string };
  departureAt?: string;
  seatsAvailable?: number;
  seatsTotal?: number;
  price?: number;
  currency?: string;
  status?: string;
};

export function HomeSearchScreen({ navigation }: { navigation: any }) {
  const [fromCityId, setFromCityId] = useState('');
  const [toCityId, setToCityId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [seats, setSeats] = useState('1');
  const [listFromFilter, setListFromFilter] = useState('all');
  const [listToFilter, setListToFilter] = useState('all');

  const citiesQuery = useQuery(async () => {
    const cacheKey = 'cities:list';
    const cached = await getCached<City[]>(cacheKey);
    if (cached && cached.length) return cached;

    const res = await api.cities.list();
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

  const tripsListQuery = useQuery(async () => {
    const response = await api.trips.search({
      status: 'published',
      pageSize: 200,
    });
    return unwrapItems<Trip>(response);
  }, []);

  useEffect(() => {
    if (!cityOptions.length) return;
    if (!fromCityId) setFromCityId(cityOptions[0].value);
    if (!toCityId) setToCityId(cityOptions[1]?.value ?? cityOptions[0].value);
  }, [cityOptions, fromCityId, toCityId]);

  const tripCityFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const trip of tripsListQuery.data ?? []) {
      const fromId = String(trip.fromCity?.id ?? '');
      const fromName = String(trip.fromCity?.name ?? '');
      if (fromId && fromName) map.set(fromId, fromName);
      const toId = String(trip.toCity?.id ?? '');
      const toName = String(trip.toCity?.name ?? '');
      if (toId && toName) map.set(toId, toName);
    }
    return [
      { value: 'all', label: 'Все города' },
      ...Array.from(map.entries())
        .sort((a, b) => a[1].localeCompare(b[1], 'ru'))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [tripsListQuery.data]);

  useEffect(() => {
    if (listFromFilter === 'all') return;
    if (!tripCityFilterOptions.some((item) => item.value === listFromFilter)) {
      setListFromFilter('all');
    }
  }, [listFromFilter, tripCityFilterOptions]);

  useEffect(() => {
    if (listToFilter === 'all') return;
    if (!tripCityFilterOptions.some((item) => item.value === listToFilter)) {
      setListToFilter('all');
    }
  }, [listToFilter, tripCityFilterOptions]);

  const fromCity = useMemo(
    () => (citiesQuery.data ?? []).find((city) => city.id === fromCityId),
    [citiesQuery.data, fromCityId],
  );
  const toCity = useMemo(
    () => (citiesQuery.data ?? []).find((city) => city.id === toCityId),
    [citiesQuery.data, toCityId],
  );

  const fromLabel = fromCity?.name ?? 'Откуда';
  const toLabel = toCity?.name ?? 'Куда';
  const canSearch =
    !!fromCityId && !!toCityId && fromCityId !== toCityId && Number(seats) > 0;
  const filteredTrips = useMemo(
    () =>
      (tripsListQuery.data ?? []).filter((trip) => {
        const fromId = String(trip.fromCity?.id ?? '');
        const toId = String(trip.toCity?.id ?? '');
        if (listFromFilter !== 'all' && fromId !== listFromFilter) return false;
        if (listToFilter !== 'all' && toId !== listToFilter) return false;
        return true;
      }),
    [listFromFilter, listToFilter, tripsListQuery.data],
  );

  return (
    <Screen>
      <Topbar title="Intercity Pulse" />

      <Card>
        <Text style={{ fontWeight: '700', fontSize: 18 }}>Поиск маршрута</Text>
        <Text style={{ opacity: 0.75 }}>
          Выберите города, дату и количество мест. Затем откройте список рейсов и детали поездки.
        </Text>

        {citiesQuery.loading && !cityOptions.length ? (
          <>
            <Skeleton height={46} />
            <Skeleton height={46} />
            <Skeleton height={46} />
          </>
        ) : (
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
        )}
      </Card>

      <DockPanel>
        <Text style={{ fontWeight: '700' }}>Pulse Dock</Text>
        <Text>
          {fromLabel} {'->'} {toLabel} • {date} • {seats} мест
        </Text>
        <Button
          title="Найти рейсы"
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
        <Text style={{ fontWeight: '700' }}>Популярные города</Text>
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
            title="Города не загружены"
            description={citiesQuery.error ?? 'Проверьте backend и повторите.'}
            actionLabel="Повторить"
            onAction={() => citiesQuery.reload()}
          />
        )}
      </Card>

      <Card>
        <Text style={{ fontWeight: '700', fontSize: 16 }}>Все поездки</Text>
        <Text style={{ opacity: 0.75 }}>
          Список опубликованных рейсов. Можно отфильтровать по городам.
        </Text>

        <View style={{ gap: 8 }}>
          <Select
            label="Фильтр: откуда"
            value={listFromFilter}
            options={tripCityFilterOptions}
            onChange={setListFromFilter}
          />
          <Select
            label="Фильтр: куда"
            value={listToFilter}
            options={tripCityFilterOptions}
            onChange={setListToFilter}
          />
        </View>

        {tripsListQuery.loading ? (
          <>
            <Skeleton height={18} />
            <Skeleton height={18} />
            <Skeleton height={18} />
          </>
        ) : null}

        {tripsListQuery.error ? (
          <EmptyState
            title="Не удалось загрузить поездки"
            description={tripsListQuery.error}
            actionLabel="Повторить"
            onAction={() => tripsListQuery.reload()}
          />
        ) : null}

        {!tripsListQuery.loading && !tripsListQuery.error ? (
          <FlatList
            data={filteredTrips}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false}
            contentContainerStyle={{ gap: 10 }}
            renderItem={({ item }) => (
              <Card>
                <Text style={{ fontWeight: '700' }}>
                  {(item.fromCity?.name ?? '—')} {'->'} {(item.toCity?.name ?? '—')}
                </Text>
                {item.status ? <Badge label={item.status} /> : null}
                <Text>
                  Отправление: {item.departureAt ? formatDateTime(item.departureAt) : '-'}
                </Text>
                <Text>Свободно мест: {item.seatsAvailable ?? item.seatsTotal ?? 0}</Text>
                <Text>Цена: {formatMoney(item.price ?? 0, item.currency ?? 'UZS')}</Text>
                <Button
                  title="Открыть детали"
                  onPress={() => navigation.navigate('TripDetails', { tripId: item.id })}
                />
              </Card>
            )}
            ListEmptyComponent={
              <EmptyState
                title="По фильтру рейсы не найдены"
                description="Измените города в фильтре и попробуйте снова."
              />
            }
          />
        ) : null}
      </Card>
    </Screen>
  );
}
