'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi, geoApi, requestsApi, routingApi, tripsApi } from '@platform/api-client';
import { apiClient } from '../../../lib/api';
import { unwrapData } from '../../../lib/unwrap';
import { PageHeader } from '../../../components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

type LiveTrip = {
  id: string;
  status: string;
};

export default function LivePage() {
  const [selectedTripId, setSelectedTripId] = useState('');
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

  const defaultTrip = useMemo<LiveTrip | null>(() => {
    const trips = tripsQuery.data ?? [];
    const started = trips.find((item) =>
      ['started', 'active'].includes(item.status.toLowerCase()),
    );
    if (started) return started;
    return trips.find((item) => item.status.toLowerCase() === 'published') ?? null;
  }, [tripsQuery.data]);

  useEffect(() => {
    if (!selectedTripId && defaultTrip?.id) {
      setSelectedTripId(defaultTrip.id);
    }
  }, [defaultTrip?.id, selectedTripId]);

  const activeTrip = useMemo<LiveTrip | null>(() => {
    const trips = tripsQuery.data ?? [];
    if (!trips.length) return null;
    if (selectedTripId) {
      const selected = trips.find((item) => item.id === selectedTripId);
      if (selected) return selected;
    }
    return defaultTrip;
  }, [defaultTrip, selectedTripId, tripsQuery.data]);

  const canPollLocation = ['started', 'active'].includes(
    String(activeTrip?.status ?? '').toLowerCase(),
  );
  const canPollEta = Boolean(activeTrip?.id);

  const locationQuery = useQuery({
    queryKey: ['live-location', activeTrip?.id],
    queryFn: async () => {
      if (!activeTrip) return null;
      try {
        const response: unknown = await geoApi(apiClient).getDriverLocation(activeTrip.id);
        return unwrapData<Record<string, unknown>>(response);
      } catch {
        return null;
      }
    },
    enabled: canPollLocation,
    retry: false,
    refetchInterval: 15_000,
  });

  const etaQuery = useQuery({
    queryKey: ['live-eta', activeTrip?.id],
    queryFn: async () => {
      if (!activeTrip) return null;
      try {
        const response: unknown = await geoApi(apiClient).getTripEtaAlias(activeTrip.id);
        return unwrapData<Record<string, unknown>>(response);
      } catch {
        try {
          const fallback: unknown = await routingApi(apiClient).tripEta(activeTrip.id);
          return unwrapData<Record<string, unknown>>(fallback);
        } catch {
          return null;
        }
      }
    },
    enabled: canPollEta,
    retry: false,
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

  const samplesQuery = useQuery({
    queryKey: ['live-geo-samples', activeTrip?.id],
    queryFn: async () => {
      if (!activeTrip?.id) return [];
      const response = await adminApi(apiClient).listGeoSamples({
        tripId: activeTrip.id,
        pageSize: 15,
      });
      const data = unwrapData<{ items?: Record<string, unknown>[] }>(response);
      return data.items ?? [];
    },
    enabled: Boolean(activeTrip?.id),
    refetchInterval: 15_000,
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Live Ops" description="Realtime trip, ETA and request operations." />
      <Card>
        <CardHeader>
          <CardTitle>Trip Selector</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <label className="text-xs text-muted-foreground">Track trip</label>
          <select
            value={activeTrip?.id ?? ''}
            onChange={(event) => setSelectedTripId(event.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2"
          >
            <option value="">Select trip</option>
            {(tripsQuery.data ?? []).map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.id} ({trip.status})
              </option>
            ))}
          </select>
        </CardContent>
      </Card>
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
            {!canPollLocation ? (
              <div className="text-muted-foreground">Live location is available after trip start.</div>
            ) : null}
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
      <Card>
        <CardHeader>
          <CardTitle>Recent Geo Samples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(samplesQuery.data ?? []).length === 0 ? (
            <div>No geo samples for selected trip</div>
          ) : (
            <ul className="space-y-1">
              {(samplesQuery.data ?? []).map((item) => (
                <li key={String(item.id)}>
                  {String(item.capturedAt ?? '-')}
                  {' | '}
                  lat={String(item.lat ?? '-')}, lon={String(item.lon ?? '-')}
                  {' | speed='}
                  {String(item.speedKmh ?? '-')}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

