import { Text, View } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapItems } from '../../api/mappers/dto';

export function RequestsInboxScreen({ navigation }: { navigation: any }) {
  const queue = useQuery(async () => unwrapItems<any>(await api.requests.driverQueue()), []);

  return (
    <Screen>
      <Topbar title="Requests inbox" />
      {(queue.data ?? []).map((request) => (
        <Card key={String(request.id)}>
          <Text style={{ fontWeight: '700' }}>Request #{String(request.id).slice(0, 8)}</Text>
          <Text>Seats: {request.seats ?? 1}</Text>
          <Text>Price: {request.price ?? 0}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Negotiate" onPress={() => navigation.navigate('DriverNegotiation', { requestId: request.id })} />
            <Button title="Accept" variant="secondary" onPress={() => api.trips.acceptRequest(String(request.tripId), String(request.id)).then(() => queue.reload())} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}
