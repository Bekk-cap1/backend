import { Text, View } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapItems } from '../../api/mappers/dto';

export function DriverHomeScreen({ navigation }: { navigation: any }) {
  const requests = useQuery(async () => unwrapItems<any>(await api.requests.driverQueue()), []);
  const trips = useQuery(async () => unwrapItems<any>(await api.trips.list({ mine: true })), []);
  const bookings = useQuery(async () => unwrapItems<any>(await api.bookings.driver()), []);

  return (
    <Screen>
      <Topbar title="Driver home" />
      <View style={{ gap: 10 }}>
        <Card>
          <Text style={{ fontWeight: '700' }}>Pending requests</Text>
          <Text>{(requests.data ?? []).length}</Text>
        </Card>
        <Card>
          <Text style={{ fontWeight: '700' }}>My trips</Text>
          <Text>{(trips.data ?? []).length}</Text>
        </Card>
        <Card>
          <Text style={{ fontWeight: '700' }}>Driver bookings</Text>
          <Text>{(bookings.data ?? []).length}</Text>
        </Card>
      </View>
      <Button title="Create trip" onPress={() => navigation.navigate('CreateTrip')} />
      <Button title="Vehicles" variant="secondary" onPress={() => navigation.navigate('Vehicles')} />
      <Button title="Verification" variant="ghost" onPress={() => navigation.navigate('DriverVerification')} />
    </Screen>
  );
}
