'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { geoApi, requestsApi, routingApi, tripsApi } from '@platform/api-client';
import { apiClient } from '../../../lib/api';
import { unwrapData } from '../../../lib/unwrap';
import { PageHeader } from '../../../components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

type LiveTrip = {
  id: string;
  status: string;
};

export default function LivePage() {
  const tripsQuery = useQuery({
    queryKey: ['live-trips'],
    queryFn: async () => {
      const response: unknown = await tripsApi(apiClient).list({ pageSize: 100 });
      const data = unwrapData<{ items?: Record<string, unknown>[] }>(response);
      return (data.items ?? []).map((item) => ({
        id: String(item.id ?? ''),
        status: String(item.status ?? 'unknown'),
      }));
    },
  });

  const activeTrip = useMemo<LiveTrip | null>(
    () =>
      (tripsQuery.data ?? []).find((item) =>
        ['published', 'started', 'active'].includes(item.status.toLowerCase()),
      ) ?? null,
    [tripsQuery.data],
  );

  const locationQuery = useQuery({
    queryKey: ['live-location', activeTrip?.id],
    queryFn: async () => {
      if (!activeTrip) return null;
      const response: unknown = await geoApi(apiClient).getDriverLocation(activeTrip.id);
      return unwrapData<Record<string, unknown>>(response);
    },
    enabled: Boolean(activeTrip?.id),
    refetchInterval: 15_000,
  });

  const etaQuery = useQuery({
    queryKey: ['live-eta', activeTrip?.id],
    queryFn: async () => {
      if (!activeTrip) return null;
      const response: unknown = await routingApi(apiClient).tripEta(activeTrip.id);
      return unwrapData<Record<string, unknown>>(response);
    },
    enabled: Boolean(activeTrip?.id),
    refetchInterval: 15_000,
  });

  const requestsQuery = useQuery({
    queryKey: ['live-driver-requests'],
    queryFn: async () => {
      const response: unknown = await requestsApi(apiClient).driverQueue();
      const data = unwrapData<{ items?: Record<string, unknown>[] }>(response);
      return data.items ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Live Ops" description="Realtime trip, ETA and request operations." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Active Trip</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>ID: {activeTrip?.id ?? 'No active trip'}</div>
            <div>Status: {activeTrip?.status ?? '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Driver Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>Lat: {String(locationQuery.data?.lat ?? '-')}</div>
            <div>Lon: {String(locationQuery.data?.lon ?? '-')}</div>
            <div>Speed: {String(locationQuery.data?.speedKmh ?? '-')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>ETA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>Seconds: {String(etaQuery.data?.etaSeconds ?? '-')}</div>
            <div>Distance meters: {String(etaQuery.data?.distanceMeters ?? '-')}</div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Pending Driver Requests</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {(requestsQuery.data ?? []).length === 0 ? (
            <div>No pending requests</div>
          ) : (
            <ul className="space-y-1">
              {(requestsQuery.data ?? []).slice(0, 20).map((item) => (
                <li key={String(item.id)}>{String(item.id)} - {String(item.status ?? 'pending')}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

