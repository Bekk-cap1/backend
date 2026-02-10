'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { adminApi } from '@platform/api-client';
import { apiClient } from '../../../../lib/api';
import { unwrapData } from '../../../../lib/unwrap';
import { PageHeader } from '../../../../components/shared/page-header';
import { DataTable } from '../../../../components/shared/data-table';
import { StatusPill } from '../../../../components/shared/status-pill';
import { SuperadminGate } from '../../../../components/shared/superadmin-gate';

type DeviceRow = {
  id: string;
  user: string;
  platform: string;
  token: string;
  model: string;
  lastSeenAt: string;
  status: string;
};

function maskToken(value: string | null | undefined) {
  if (!value) return '-';
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function SuperadminDevicesPage() {
  const query = useQuery({
    queryKey: ['superadmin-devices'],
    queryFn: async () => {
      const response = await adminApi(apiClient).listDevices({ pageSize: 200 });
      const data = unwrapData<{ items?: any[] }>(response);
      return data.items ?? [];
    },
  });

  const rows = useMemo<DeviceRow[]>(
    () =>
      (query.data ?? []).map((item: any) => ({
        id: item.id,
        user: item.user?.phone ?? item.userId ?? '-',
        platform: item.platform ?? 'unknown',
        token: maskToken(item.token),
        model: item.model ?? '-',
        lastSeenAt: item.lastSeenAt
          ? new Date(item.lastSeenAt).toLocaleString()
          : '-',
        status: item.lastSeenAt ? 'active' : 'unknown',
      })),
    [query.data],
  );

  const columns: Array<ColumnDef<DeviceRow>> = [
    { accessorKey: 'id', header: 'Device ID' },
    { accessorKey: 'user', header: 'User' },
    { accessorKey: 'platform', header: 'Platform' },
    { accessorKey: 'token', header: 'Token' },
    { accessorKey: 'model', header: 'Model' },
    { accessorKey: 'lastSeenAt', header: 'Last Seen' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusPill status={row.original.status} />,
    },
  ];

  return (
    <SuperadminGate>
      <div className="space-y-4">
        <PageHeader
          title="Superadmin Devices"
          description="Inspect registered device tokens and activity."
        />
        <DataTable
          columns={columns}
          data={rows}
          loading={query.isLoading}
          error={query.isError ? 'Unable to load devices.' : null}
          onRetry={() => query.refetch()}
          searchPlaceholder="Search by user / platform / model"
        />
      </div>
    </SuperadminGate>
  );
}
