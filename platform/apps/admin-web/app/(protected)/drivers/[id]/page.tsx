'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@platform/api-client';
import { apiClient } from '../../../../lib/api';
import { unwrapData } from '../../../../lib/unwrap';
import { PageHeader } from '../../../../components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { StatusPill } from '../../../../components/shared/status-pill';

export default function DriverDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? '');

  const driversQuery = useQuery({
    queryKey: ['driver-details', id],
    queryFn: async () => {
      const response: unknown = await adminApi(apiClient).listDrivers({ userId: id });
      const data = unwrapData<{ items?: Record<string, unknown>[] }>(response);
      return data.items ?? [];
    },
    enabled: id.length > 0,
  });

  const driver = useMemo(
    () =>
      (driversQuery.data ?? []).find(
        (entry) => String(entry.userId ?? entry.id ?? '') === id,
      ),
    [driversQuery.data, id],
  );

  return (
    <div className="space-y-4">
      <PageHeader title={`Driver ${id.slice(0, 8)}`} description="Driver verification details." />
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>User ID: {String(driver?.userId ?? id)}</div>
          <div>Phone: {String(driver?.phone ?? '-')}</div>
          <div>Vehicle: {String(driver?.vehicleType ?? '-')}</div>
          <div className="flex items-center gap-2">
            Status:
            <StatusPill status={String(driver?.status ?? 'pending')} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

