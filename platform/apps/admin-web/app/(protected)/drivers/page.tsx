'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { adminApi } from '@platform/api-client';
import { isApiActionAvailable } from '@platform/shared';
import { apiClient } from '../../../lib/api';
import { PageHeader } from '../../../components/shared/page-header';
import { DataTable } from '../../../components/shared/data-table';
import { StatusPill } from '../../../components/shared/status-pill';
import { ConfirmDialog } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { appToast } from '../../../components/shared/toast';
import { unwrapData } from '../../../lib/unwrap';

export default function DriversPage() {
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState<{ id: string; mode: 'verify' | 'reject' } | null>(null);

  const driversQuery = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const response: any = await adminApi(apiClient).listDrivers({ status: 'pending' });
      const data = unwrapData<{ items?: any[] }>(response);
      return data.items ?? [];
    },
    enabled: isApiActionAvailable('drivers.list'),
  });

  const moderationMutation = useMutation({
    mutationFn: async ({
      id,
      mode,
      reason,
    }: {
      id: string;
      mode: 'verify' | 'reject';
      reason?: string;
    }) => {
      if (mode === 'verify') return adminApi(apiClient).verifyDriver(id);
      return adminApi(apiClient).rejectDriver(id, { reason: reason ?? 'Manual rejection' });
    },
    onSuccess: () => {
      appToast.success('Driver moderation updated');
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
    onError: () => appToast.error('Driver moderation failed'),
  });

  const rows = useMemo(
    () =>
      (driversQuery.data ?? []).map((item: any) => ({
        id: item.userId ?? item.id,
        name: item.name ?? item.phone ?? item.userId,
        status: item.status ?? 'pending',
        submittedAt: item.createdAt ? new Date(item.createdAt).toLocaleString() : '-',
      })),
    [driversQuery.data],
  );

  const columns: Array<ColumnDef<any>> = [
    { accessorKey: 'name', header: 'Driver' },
    { accessorKey: 'submittedAt', header: 'SubmittedAt' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusPill status={row.original.status} /> },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Link
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-muted"
            href={`/drivers/${row.original.id}`}
          >
            View
          </Link>
          <Button
            disabled={!isApiActionAvailable('drivers.verify')}
            onClick={() => setDecision({ id: row.original.id, mode: 'verify' })}
          >
            Verify
          </Button>
          <Button
            className="bg-rose-600 text-white"
            disabled={!isApiActionAvailable('drivers.reject')}
            onClick={() => setDecision({ id: row.original.id, mode: 'reject' })}
          >
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Drivers" description="Verification queue and moderation." />
      <DataTable
        columns={columns}
        data={rows}
        loading={driversQuery.isLoading}
        error={driversQuery.isError ? 'Cannot load drivers' : null}
        onRetry={() => driversQuery.refetch()}
      />
      <ConfirmDialog
        open={!!decision}
        title={decision?.mode === 'verify' ? 'Verify driver?' : 'Reject driver?'}
        description="Moderation action will be written to audit."
        confirmText={decision?.mode === 'verify' ? 'Verify' : 'Reject'}
        requireReason={decision?.mode === 'reject'}
        reasonLabel="Rejection reason"
        busy={moderationMutation.isPending}
        onClose={() => setDecision(null)}
        onConfirm={(reason) => {
          if (!decision) return;
          moderationMutation.mutate({ ...decision, reason });
          setDecision(null);
        }}
      />
    </div>
  );
}
