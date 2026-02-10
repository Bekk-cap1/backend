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

type SessionRow = {
  id: string;
  user: string;
  ip: string;
  ua: string;
  expiresAt: string;
  lastUsedAt: string;
  status: string;
};

export default function SuperadminSessionsPage() {
  const query = useQuery({
    queryKey: ['superadmin-sessions'],
    queryFn: async () => {
      const response = await adminApi(apiClient).listSessions({ pageSize: 200 });
      const data = unwrapData<{ items?: any[] }>(response);
      return data.items ?? [];
    },
  });

  const rows = useMemo<SessionRow[]>(
    () =>
      (query.data ?? []).map((item: any) => ({
        id: item.id,
        user: item.user?.phone ?? item.userId ?? '-',
        ip: item.ip ?? '-',
        ua: item.userAgent ?? '-',
        expiresAt: item.expiresAt ? new Date(item.expiresAt).toLocaleString() : '-',
        lastUsedAt: item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleString() : '-',
        status: item.revokedAt ? 'revoked' : 'active',
      })),
    [query.data],
  );

  const columns: Array<ColumnDef<SessionRow>> = [
    { accessorKey: 'id', header: 'Session ID' },
    { accessorKey: 'user', header: 'User' },
    { accessorKey: 'ip', header: 'IP' },
    { accessorKey: 'ua', header: 'User Agent' },
    { accessorKey: 'lastUsedAt', header: 'Last Used' },
    { accessorKey: 'expiresAt', header: 'Expires' },
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
          title="Superadmin Sessions"
          description="Inspect active and revoked refresh sessions."
        />
        <DataTable
          columns={columns}
          data={rows}
          loading={query.isLoading}
          error={query.isError ? 'Unable to load sessions.' : null}
          onRetry={() => query.refetch()}
          searchPlaceholder="Search sessions"
        />
      </div>
    </SuperadminGate>
  );
}
