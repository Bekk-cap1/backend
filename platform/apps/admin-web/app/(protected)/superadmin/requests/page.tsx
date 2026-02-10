'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { adminApi } from '@platform/api-client';
import { apiClient } from '../../../../lib/api';
import { unwrapData } from '../../../../lib/unwrap';
import { PageHeader } from '../../../../components/shared/page-header';
import { DataTable } from '../../../../components/shared/data-table';
import { Button } from '../../../../components/ui/button';
import { StatusPill } from '../../../../components/shared/status-pill';
import { SuperadminGate } from '../../../../components/shared/superadmin-gate';
import { SuperadminConfirmBar } from '../../../../components/shared/superadmin-confirm-bar';
import { appToast } from '../../../../components/shared/toast';

type RequestRow = {
  id: string;
  tripId: string;
  passengerId: string;
  seats: number;
  amount: string;
  status: string;
};

export default function SuperadminRequestsPage() {
  const queryClient = useQueryClient();
  const [confirmToken, setConfirmToken] = useState('');

  const requestsQuery = useQuery({
    queryKey: ['superadmin-requests'],
    queryFn: async () => {
      const response = await adminApi(apiClient).listRequests({ pageSize: 200 });
      const data = unwrapData<{ items?: any[] }>(response);
      return data.items ?? [];
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) =>
      adminApi(apiClient).cancelRequest(requestId, { reason }, confirmToken),
    onSuccess: () => {
      appToast.success('Request canceled');
      queryClient.invalidateQueries({ queryKey: ['superadmin-requests'] });
    },
    onError: () => appToast.error('Request action failed'),
  });

  const rows = useMemo<RequestRow[]>(
    () =>
      (requestsQuery.data ?? []).map((item: any) => ({
        id: item.id,
        tripId: item.tripId,
        passengerId: item.passenger?.phone ?? item.passengerId,
        seats: item.seats,
        amount: `${item.price ?? 0} ${item.currency ?? 'UZS'}`,
        status: item.status ?? 'unknown',
      })),
    [requestsQuery.data],
  );

  const columns: Array<ColumnDef<RequestRow>> = [
    { accessorKey: 'id', header: 'Request ID' },
    { accessorKey: 'tripId', header: 'Trip ID' },
    { accessorKey: 'passengerId', header: 'Passenger' },
    { accessorKey: 'seats', header: 'Seats' },
    { accessorKey: 'amount', header: 'Amount' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusPill status={row.original.status} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          className="bg-rose-600 text-white"
          disabled={!confirmToken || cancelMutation.isPending}
          onClick={() => {
            const reason = window.prompt('Reason (min 10 chars)') ?? '';
            if (reason.trim().length < 10) return;
            cancelMutation.mutate({ requestId: row.original.id, reason });
          }}
        >
          Cancel
        </Button>
      ),
    },
  ];

  return (
    <SuperadminGate>
      <div className="space-y-4">
        <PageHeader
          title="Superadmin Requests"
          description="Resolve request disputes with force-cancel."
        />
        <SuperadminConfirmBar
          confirmToken={confirmToken}
          setConfirmToken={setConfirmToken}
        />
        <DataTable
          columns={columns}
          data={rows}
          loading={requestsQuery.isLoading}
          error={requestsQuery.isError ? 'Unable to load requests.' : null}
          onRetry={() => requestsQuery.refetch()}
          searchPlaceholder="Search requests"
        />
      </div>
    </SuperadminGate>
  );
}
