'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { notificationsApi } from '@platform/api-client';
import { apiClient } from '../../../lib/api';
import { unwrapData } from '../../../lib/unwrap';
import { PageHeader } from '../../../components/shared/page-header';
import { DataTable } from '../../../components/shared/data-table';
import { StatusPill } from '../../../components/shared/status-pill';
import { Button } from '../../../components/ui/button';

type NotificationRow = {
  id: string;
  type: string;
  status: string;
  createdAt: string;
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response: unknown = await notificationsApi(apiClient).listMine({ pageSize: 50 });
      const data = unwrapData<{ items?: Record<string, unknown>[] }>(response);
      return data.items ?? [];
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => notificationsApi(apiClient).markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const rows = useMemo<NotificationRow[]>(
    () =>
      (notificationsQuery.data ?? []).map((item) => ({
        id: String(item.id ?? ''),
        type: String(item.type ?? 'generic'),
        status: item.readAt ? 'read' : 'unread',
        createdAt: item.createdAt ? new Date(String(item.createdAt)).toLocaleString() : '-',
      })),
    [notificationsQuery.data],
  );

  const columns: Array<ColumnDef<NotificationRow>> = [
    { accessorKey: 'type', header: 'Type' },
    { accessorKey: 'createdAt', header: 'Created' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusPill status={row.original.status} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button className="bg-muted text-foreground" onClick={() => markReadMutation.mutate(row.original.id)}>
          Mark read
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Notifications" description="Admin event feed and acknowledgements." />
      <DataTable
        columns={columns}
        data={rows}
        loading={notificationsQuery.isLoading}
        error={notificationsQuery.isError ? 'Unable to load notifications' : null}
        onRetry={() => notificationsQuery.refetch()}
      />
    </div>
  );
}

