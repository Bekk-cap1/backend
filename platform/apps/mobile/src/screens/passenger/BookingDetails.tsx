import { useMemo } from 'react';
import { Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { Badge } from '../../ui/components/Badge';
import { MapView } from '../../ui/components/Map/MapView';
import { RoutePolyline } from '../../ui/components/Map/RoutePolyline';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapPayload } from '../../api/mappers/dto';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';

export function BookingDetailsScreen({ route, navigation }: { route: any; navigation: any }) {
  const bookingId = String(route.params?.bookingId ?? '');
  const { show } = useToast();

  const bookingQuery = useQuery(async () => unwrapPayload<any>(await api.bookings.getById(bookingId)), [bookingId]);
  const tripId = String(bookingQuery.data?.tripId ?? '');

  const locationQuery = useQuery(
    async () => (tripId ? unwrapPayload<any>(await api.geo.getDriverLocation(tripId)) : null),
    [tripId],
  );

  const etaQuery = useQuery(
    async () => (tripId ? unwrapPayload<any>(await api.geo.getTripEta(tripId)) : null),
    [tripId],
  );

  const mapCenter = useMemo(() => {
    const point = locationQuery.data?.location ?? locationQuery.data;
    if (!point?.lat || !point?.lon) return null;
    return { lat: Number(point.lat), lon: Number(point.lon) };
  }, [locationQuery.data]);

  return (
    <Screen>
      <Topbar title={`Booking ${bookingId.slice(0, 8)}`} right={<Button title="Back" variant="ghost" onPress={() => navigation.goBack()} />} />
      <Card>
        <Badge label={String(bookingQuery.data?.status ?? 'unknown')} />
        <Text>Trip: {tripId || 'n/a'}</Text>
        <Text>Seats: {bookingQuery.data?.seats ?? 'n/a'}</Text>
        <Text>ETA: {etaQuery.data?.etaMinutes ?? 'n/a'} min</Text>
      </Card>

      <MapView center={mapCenter}>
        <RoutePolyline
          distanceMeters={bookingQuery.data?.distanceMeters}
          durationSeconds={bookingQuery.data?.durationSeconds}
          etaSeconds={etaQuery.data?.etaSeconds}
        />
      </MapView>

      <Card>
        <Button title="Pay now" onPress={() => navigation.navigate('Payments', { bookingId, tripId })} />
        <Button
          title="Cancellation quote"
          variant="secondary"
          onPress={async () => {
            try {
              const quote = unwrapPayload<any>(await api.cancellations.quote(bookingId));
              show({ title: `Refund ${quote.refundAmount ?? 0}, fee ${quote.feeAmount ?? 0}`, tone: 'info' });
            } catch (error) {
              show({ title: toErrorMessage(error), tone: 'danger' });
            }
          }}
        />
        <Button
          title="Cancel booking"
          variant="destructive"
          onPress={async () => {
            try {
              await api.cancellations.apply(bookingId);
              show({ title: 'Booking canceled', tone: 'success' });
              await bookingQuery.reload();
            } catch (error) {
              show({ title: toErrorMessage(error), tone: 'danger' });
            }
          }}
        />
      </Card>
    </Screen>
  );
}
