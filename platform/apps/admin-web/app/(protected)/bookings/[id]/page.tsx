'use client';

import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '@platform/api-client';
import { apiClient } from '../../../../lib/api';
import { unwrapData } from '../../../../lib/unwrap';
import { PageHeader } from '../../../../components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { StatusPill } from '../../../../components/shared/status-pill';
import { Button } from '../../../../components/ui/button';
import { appToast } from '../../../../components/shared/toast';

export default function BookingDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? '');
  const queryClient = useQueryClient();

  const bookingQuery = useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const response: unknown = await bookingsApi(apiClient).getById(id);
      return unwrapData<Record<string, unknown>>(response);
    },
    enabled: id.length > 0,
  });

  const cancelMutation = useMutation({
    mutationFn: async () => bookingsApi(apiClient).cancel(id),
    onSuccess: () => {
      appToast.success('Booking cancelled');
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
    },
    onError: () => appToast.error('Cancellation failed'),
  });

  const booking = bookingQuery.data;
  return (
    <div className="space-y-4">
      <PageHeader title={`Booking ${id.slice(0, 8)}`} description="Booking details and actions." />
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span>Status:</span>
            <StatusPill status={String(booking?.status ?? 'unknown')} />
          </div>
          <div>Trip ID: {String(booking?.tripId ?? '-')}</div>
          <div>Passenger ID: {String(booking?.passengerId ?? '-')}</div>
          <div>Seats: {String(booking?.seats ?? '-')}</div>
          <Button className="bg-rose-600 text-white" onClick={() => cancelMutation.mutate()}>
            Cancel booking
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

