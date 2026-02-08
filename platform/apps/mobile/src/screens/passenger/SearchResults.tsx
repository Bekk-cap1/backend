import { useMemo } from 'react';
import { FlatList, Text, View } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { EmptyState } from '../../ui/components/EmptyState';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapItems } from '../../api/mappers/dto';
import { formatMoney, formatDateTime } from '../../core/format';

type Trip = {
  id: string;
  price?: number;
  currency?: string;
  departureAt?: string;
  seatsAvailable?: number;
  seatsTotal?: number;
  driver?: { phone?: string };
};

export function SearchResultsScreen({ route, navigation }: { route: any; navigation: any }) {
  const params = route.params ?? {};

  const tripsQuery = useQuery(async () => {
    const response = await api.trips.search(params);
    return unwrapItems<Trip>(response);
  }, [JSON.stringify(params)]);

  const title = useMemo(() => `Trips ${params.fromCityId ?? '-'} -> ${params.toCityId ?? '-'}`, [params.fromCityId, params.toCityId]);

  return (
    <Screen>
      <Topbar title={title} right={<Button title="Back" variant="ghost" onPress={() => navigation.goBack()} />} />

      {tripsQuery.loading ? <Card><Text>Loading trips...</Text></Card> : null}

      {tripsQuery.error ? (
        <Card>
          <EmptyState title="Failed to load trips" description={tripsQuery.error} actionLabel="Retry" onAction={() => tripsQuery.reload()} />
        </Card>
      ) : null}

      {!tripsQuery.loading && !tripsQuery.error ? (
        <FlatList
          data={tripsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <Card>
              <Text style={{ fontSize: 16, fontWeight: '700' }}>Trip #{item.id.slice(0, 8)}</Text>
              <Text>Departure: {item.departureAt ? formatDateTime(item.departureAt) : 'n/a'}</Text>
              <Text>Seats: {item.seatsAvailable ?? item.seatsTotal ?? 0}</Text>
              <Text>Driver: {item.driver?.phone ?? 'n/a'}</Text>
              <Text>Price: {formatMoney(item.price ?? 0, item.currency ?? 'UZS')}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button title="Open" onPress={() => navigation.navigate('TripDetails', { tripId: item.id })} />
              </View>
            </Card>
          )}
          ListEmptyComponent={<EmptyState title="No trips found" description="Try different date or route." />}
        />
      ) : null}
    </Screen>
  );
}
