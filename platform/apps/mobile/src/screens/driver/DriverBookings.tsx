import { Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapItems } from '../../api/mappers/dto';

export function DriverBookingsScreen() {
  const query = useQuery(async () => unwrapItems<any>(await api.bookings.driver()), []);

  return (
    <Screen>
      <Topbar title="Driver bookings" />
      {(query.data ?? []).map((booking) => (
        <Card key={String(booking.id)}>
          <Text style={{ fontWeight: '700' }}>Booking #{String(booking.id).slice(0, 8)}</Text>
          <Text>Status: {booking.status}</Text>
        </Card>
      ))}
    </Screen>
  );
}
