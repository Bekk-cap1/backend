'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { adminApi } from '@platform/api-client';
import { apiClient } from '../../../../lib/api';
import { unwrapData } from '../../../../lib/unwrap';
import { PageHeader } from '../../../../components/shared/page-header';
import { DataTable } from '../../../../components/shared/data-table';
import { StatusPill } from '../../../../components/shared/status-pill';
import { SuperadminGate } from '../../../../components/shared/superadmin-gate';
import { SuperadminConfirmBar } from '../../../../components/shared/superadmin-confirm-bar';
import { Button } from '../../../../components/ui/button';
import { appToast } from '../../../../components/shared/toast';

type OutboxRow = {
  id: string;
  topic: string;
  aggregate: string;
  status: string;
  attempts: number;
  createdAt: string;
  nextRetryAt: string;
};

export default function SuperadminOutboxPage() {
  const queryClient = useQueryClient();
  const [confirmToken, setConfirmToken] = useState('');

  const outboxQuery = useQuery({
    queryKey: ['superadmin-outbox'],
    queryFn: async () => {
      const response = await adminApi(apiClient).listOutboxEvents({ pageSize: 200 });
      const data = unwrapData<{ items?: any[] }>(response);
      return data.items ?? [];
    },
  });

  const retryMutation = useMutation({
    mutationFn: async ({ eventId, reason }: { eventId: string; reason: string }) =>
      adminApi(apiClient).retryOutboxEvent(eventId, { reason }, confirmToken),
    onSuccess: () => {
      appToast.success('Outbox event queued for retry');
      queryClient.invalidateQueries({ queryKey: ['superadmin-outbox'] });
    },
    onError: () => appToast.error('Retry failed'),
  });

  const rows = useMemo<OutboxRow[]>(
    () =>
      (outboxQuery.data ?? []).map((item: any) => ({
        id: item.id,
        topic: item.topic,
        aggregate: `${item.aggregateType}:${item.aggregateId ?? '-'}`,
        status: item.status ?? 'unknown',
        attempts: Number(item.attempts ?? 0),
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString() : '-',
        nextRetryAt: item.nextRetryAt ? new Date(item.nextRetryAt).toLocaleString() : '-',
      })),
    [outboxQuery.data],
  );

  const columns: Array<ColumnDef<OutboxRow>> = [
    { accessorKey: 'id', header: 'Outbox ID' },
    { accessorKey: 'topic', header: 'Topic' },
    { accessorKey: 'aggregate', header: 'Aggregate' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusPill status={row.original.status} />,
    },
    { accessorKey: 'attempts', header: 'Attempts' },
    { accessorKey: 'nextRetryAt', header: 'Next Retry' },
    { accessorKey: 'createdAt', header: 'Created' },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          className="bg-muted text-foreground"
          disabled={!confirmToken || retryMutation.isPending}
          onClick={() => {
            const reason = window.prompt('Reason (min 10 chars)') ?? '';
            if (reason.trim().length < 10) return;
            retryMutation.mutate({ eventId: row.original.id, reason });
          }}
        >
          Retry
        </Button>
      ),
    },
  ];

  return (
    <SuperadminGate>
      <div className="space-y-4">
        <PageHeader
          title="Superadmin Outbox"
          description="Monitor outbox queue and force retries."
        />
        <SuperadminConfirmBar confirmToken={confirmToken} setConfirmToken={setConfirmToken} />
        <DataTable
          columns={columns}
          data={rows}
          loading={outboxQuery.isLoading}
          error={outboxQuery.isError ? 'Unable to load outbox events.' : null}
          onRetry={() => outboxQuery.refetch()}
          searchPlaceholder="Search by topic / aggregate / status"
        />
      </div>
    </SuperadminGate>
  );
}
