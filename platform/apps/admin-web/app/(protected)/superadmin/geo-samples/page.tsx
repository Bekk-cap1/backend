'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { adminApi } from '@platform/api-client';
import { apiClient } from '../../../../lib/api';
import { unwrapData } from '../../../../lib/unwrap';
import { PageHeader } from '../../../../components/shared/page-header';
import { DataTable } from '../../../../components/shared/data-table';
import { SuperadminGate } from '../../../../components/shared/superadmin-gate';

type GeoRow = {
  id: string;
  tripId: string;
  driverId: string;
  lat: string;
  lon: string;
  speed: string;
  heading: string;
  capturedAt: string;
};

function formatCoord(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '-';
  return parsed.toFixed(6);
}

export default function SuperadminGeoSamplesPage() {
  const query = useQuery({
    queryKey: ['superadmin-geo-samples'],
    queryFn: async () => {
      const response = await adminApi(apiClient).listGeoSamples({ pageSize: 200 });
      const data = unwrapData<{ items?: any[] }>(response);
      return data.items ?? [];
    },
  });

  const rows = useMemo<GeoRow[]>(
    () =>
      (query.data ?? []).map((item: any) => ({
        id: item.id,
        tripId: item.tripId ?? '-',
        driverId: item.driverId ?? '-',
        lat: formatCoord(item.lat),
        lon: formatCoord(item.lon),
        speed: item.speedKmh == null ? '-' : String(item.speedKmh),
        heading: item.headingDeg == null ? '-' : String(item.headingDeg),
        capturedAt: item.capturedAt
          ? new Date(item.capturedAt).toLocaleString()
          : '-',
      })),
    [query.data],
  );

  const columns: Array<ColumnDef<GeoRow>> = [
    { accessorKey: 'id', header: 'Sample ID' },
    { accessorKey: 'tripId', header: 'Trip ID' },
    { accessorKey: 'driverId', header: 'Driver ID' },
    { accessorKey: 'lat', header: 'Lat' },
    { accessorKey: 'lon', header: 'Lon' },
    { accessorKey: 'speed', header: 'Speed km/h' },
    { accessorKey: 'heading', header: 'Heading' },
    { accessorKey: 'capturedAt', header: 'Captured At' },
  ];

  return (
    <SuperadminGate>
      <div className="space-y-4">
        <PageHeader
          title="Superadmin Geo Samples"
          description="Raw driver location samples for ops debugging and incident response."
        />
        <DataTable
          columns={columns}
          data={rows}
          loading={query.isLoading}
          error={query.isError ? 'Unable to load geo samples.' : null}
          onRetry={() => query.refetch()}
          searchPlaceholder="Search by trip / driver"
        />
      </div>
    </SuperadminGate>
  );
}
