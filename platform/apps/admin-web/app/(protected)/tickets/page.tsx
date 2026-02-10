'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { adminApi } from '@platform/api-client';
import { isApiActionAvailable } from '@platform/shared';
import { apiClient } from '../../../lib/api';
import { unwrapData } from '../../../lib/unwrap';
import { PageHeader } from '../../../components/shared/page-header';
import { DataTable } from '../../../components/shared/data-table';
import { StatusPill } from '../../../components/shared/status-pill';
import { Button } from '../../../components/ui/button';
import { appToast } from '../../../components/shared/toast';

export default function TicketsPage() {
  const queryClient = useQueryClient();
  const ticketsQuery = useQuery({
    queryKey: ['tickets-admin'],
    queryFn: async () => {
      const response: any = await adminApi(apiClient).listTickets();
      const data = unwrapData<{ items?: any[] }>(response);
      return data.items ?? [];
    },
    enabled: isApiActionAvailable('tickets.list'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi(apiClient).updateTicketStatus(id, { status }),
    onSuccess: (_data, variables) => {
      appToast.success('Ticket status updated');
      queryClient.setQueryData(['tickets-admin'], (prev: any) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((item: any) =>
          item?.id === variables.id ? { ...item, status: variables.status } : item,
        );
      });
    },
    onError: () => appToast.error('Ticket update failed'),
  });

  const rows = useMemo(
    () =>
      (ticketsQuery.data ?? []).map((item: any) => ({
        id: item.id,
        subject: item.subject ?? '-',
        status: item.status ?? 'open',
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString() : '-',
      })),
    [ticketsQuery.data],
  );

  const columns: Array<ColumnDef<any>> = [
    {
      accessorKey: 'subject',
      header: 'Ticket',
      cell: ({ row }) => (
        <Link className="text-primary underline" href={`/tickets/${row.original.id}`}>
          {row.original.subject}
        </Link>
      ),
    },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusPill status={row.original.status} /> },
    { accessorKey: 'createdAt', header: 'CreatedAt' },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            disabled={!isApiActionAvailable('tickets.status')}
            onClick={() => statusMutation.mutate({ id: row.original.id, status: 'in_progress' })}
          >
            In Progress
          </Button>
          <Button
            className="bg-muted text-foreground"
            disabled={!isApiActionAvailable('tickets.status')}
            onClick={() => statusMutation.mutate({ id: row.original.id, status: 'resolved' })}
          >
            Resolve
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Tickets" description="Support queue with status transitions." />
      <DataTable
        columns={columns}
        data={rows}
        loading={ticketsQuery.isLoading}
        error={ticketsQuery.isError ? 'Unable to load tickets' : null}
        onRetry={() => ticketsQuery.refetch()}
      />
    </div>
  );
}
