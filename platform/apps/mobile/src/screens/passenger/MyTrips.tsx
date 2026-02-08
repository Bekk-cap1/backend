import { Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapItems } from '../../api/mappers/dto';
import { EmptyState } from '../../ui/components/EmptyState';

export function MyTripsScreen({ navigation }: { navigation: any }) {
  const bookingsQuery = useQuery(async () => unwrapItems<any>(await api.bookings.my()), []);

  return (
    <Screen>
      <Topbar title="My trips" />
      {(bookingsQuery.data ?? []).map((booking) => (
        <Card key={String(booking.id)}>
          <Text style={{ fontWeight: '700' }}>Booking #{String(booking.id).slice(0, 8)}</Text>
          <Text>Status: {String(booking.status ?? 'unknown')}</Text>
          <Button title="Open" onPress={() => navigation.navigate('BookingDetails', { bookingId: booking.id })} />
        </Card>
      ))}
      {!bookingsQuery.loading && !(bookingsQuery.data ?? []).length ? (
        <Card>
          <EmptyState title="No bookings yet" description="Search for trips and request seats." />
        </Card>
      ) : null}
    </Screen>
  );
}
