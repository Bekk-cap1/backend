'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { tripsApi } from '@platform/api-client';
import { apiClient } from '../../../../lib/api';
import { unwrapData } from '../../../../lib/unwrap';
import { PageHeader } from '../../../../components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { StatusPill } from '../../../../components/shared/status-pill';

export default function TripDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? '');

  const tripQuery = useQuery({
    queryKey: ['trip', id],
    queryFn: async () => {
      const response: unknown = await tripsApi(apiClient).getById(id);
      return unwrapData<Record<string, unknown>>(response);
    },
    enabled: id.length > 0,
  });

  const trip = tripQuery.data;

  return (
    <div className="space-y-4">
      <PageHeader title={`Trip ${id.slice(0, 8)}`} description="Trip overview, related data and status." />
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span>Status:</span>
            <StatusPill status={String(trip?.status ?? 'unknown')} />
          </div>
          <div>From City: {String(trip?.fromCityId ?? '-')}</div>
          <div>To City: {String(trip?.toCityId ?? '-')}</div>
          <div>
            Departure:{' '}
            {trip?.departureAt ? new Date(String(trip.departureAt)).toLocaleString() : '-'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

