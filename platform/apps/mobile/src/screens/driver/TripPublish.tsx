import { Text, View } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapItems } from '../../api/mappers/dto';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';

export function DriverTripsScreen({ navigation }: { navigation: any }) {
  const { show } = useToast();
  const tripsQuery = useQuery(async () => unwrapItems<any>(await api.trips.list({ mine: true })), []);

  return (
    <Screen>
      <Topbar
        title="Trips"
        right={<Button title="Create" variant="secondary" onPress={() => navigation.navigate('CreateTrip')} />}
      />

      {(tripsQuery.data ?? []).map((trip) => (
        <Card key={String(trip.id)}>
          <Text style={{ fontWeight: '700' }}>Trip #{String(trip.id).slice(0, 8)}</Text>
          <Text>Status: {trip.status}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              title="Publish"
              onPress={async () => {
                try {
                  await api.trips.publish(String(trip.id));
                  show({ title: 'Published', tone: 'success' });
                  await tripsQuery.reload();
                } catch (error) {
                  show({ title: toErrorMessage(error), tone: 'danger' });
                }
              }}
            />
            <Button
              title="Go active"
              variant="secondary"
              onPress={() => navigation.navigate('ActiveTrip', { tripId: String(trip.id) })}
            />
          </View>
        </Card>
      ))}
    </Screen>
  );
}
