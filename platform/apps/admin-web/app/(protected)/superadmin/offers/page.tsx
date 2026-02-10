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

type OfferRow = {
  id: string;
  requestId: string;
  proposer: string;
  seats: number;
  amount: string;
  status: string;
};

export default function SuperadminOffersPage() {
  const queryClient = useQueryClient();
  const [confirmToken, setConfirmToken] = useState('');

  const offersQuery = useQuery({
    queryKey: ['superadmin-offers'],
    queryFn: async () => {
      const response = await adminApi(apiClient).listOffers({ pageSize: 200 });
      const data = unwrapData<{ items?: any[] }>(response);
      return data.items ?? [];
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({
      offerId,
      action,
      reason,
    }: {
      offerId: string;
      action: 'accept' | 'reject' | 'cancel';
      reason: string;
    }) =>
      adminApi(apiClient).forceOfferAction(offerId, action, { reason }, confirmToken),
    onSuccess: () => {
      appToast.success('Offer updated');
      queryClient.invalidateQueries({ queryKey: ['superadmin-offers'] });
    },
    onError: () => appToast.error('Offer action failed'),
  });

  const rows = useMemo<OfferRow[]>(
    () =>
      (offersQuery.data ?? []).map((item: any) => ({
        id: item.id,
        requestId: item.requestId,
        proposer: item.proposer?.phone ?? item.proposerId ?? '-',
        seats: item.seats ?? 0,
        amount: `${item.price ?? 0} ${item.currency ?? 'UZS'}`,
        status: item.status ?? 'unknown',
      })),
    [offersQuery.data],
  );

  const columns: Array<ColumnDef<OfferRow>> = [
    { accessorKey: 'id', header: 'Offer ID' },
    { accessorKey: 'requestId', header: 'Request ID' },
    { accessorKey: 'proposer', header: 'Proposer' },
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
        <div className="flex gap-2">
          {(['accept', 'reject', 'cancel'] as const).map((action) => (
            <Button
              key={action}
              className={action === 'accept' ? '' : 'bg-muted text-foreground'}
              disabled={!confirmToken || actionMutation.isPending}
              onClick={() => {
                const reason = window.prompt('Reason (min 10 chars)') ?? '';
                if (reason.trim().length < 10) return;
                actionMutation.mutate({ offerId: row.original.id, action, reason });
              }}
            >
              {action}
            </Button>
          ))}
        </div>
      ),
    },
  ];

  return (
    <SuperadminGate>
      <div className="space-y-4">
        <PageHeader
          title="Superadmin Offers"
          description="Force resolve offer negotiation states."
        />
        <SuperadminConfirmBar
          confirmToken={confirmToken}
          setConfirmToken={setConfirmToken}
        />
        <DataTable
          columns={columns}
          data={rows}
          loading={offersQuery.isLoading}
          error={offersQuery.isError ? 'Unable to load offers.' : null}
          onRetry={() => offersQuery.refetch()}
          searchPlaceholder="Search offers"
        />
      </div>
    </SuperadminGate>
  );
}
