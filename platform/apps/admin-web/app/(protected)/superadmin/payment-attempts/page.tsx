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

type AttemptRow = {
  id: string;
  paymentId: string;
  seq: number;
  status: string;
  checkoutUrl: string;
  failReason: string;
  createdAt: string;
};

export default function SuperadminPaymentAttemptsPage() {
  const query = useQuery({
    queryKey: ['superadmin-payment-attempts'],
    queryFn: async () => {
      const response = await adminApi(apiClient).listPaymentAttempts({
        pageSize: 200,
      });
      const data = unwrapData<{ items?: any[] }>(response);
      return data.items ?? [];
    },
  });

  const rows = useMemo<AttemptRow[]>(
    () =>
      (query.data ?? []).map((item: any) => ({
        id: item.id,
        paymentId: item.paymentId ?? item.payment?.id ?? '-',
        seq: Number(item.seq ?? 0),
        status: item.status ?? 'unknown',
        checkoutUrl: item.checkoutUrl ?? '-',
        failReason: item.failReason ?? '-',
        createdAt: item.createdAt
          ? new Date(item.createdAt).toLocaleString()
          : '-',
      })),
    [query.data],
  );

  const columns: Array<ColumnDef<AttemptRow>> = [
    { accessorKey: 'id', header: 'Attempt ID' },
    { accessorKey: 'paymentId', header: 'Payment ID' },
    { accessorKey: 'seq', header: 'Seq' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusPill status={row.original.status} />,
    },
    { accessorKey: 'checkoutUrl', header: 'Checkout URL' },
    { accessorKey: 'failReason', header: 'Failure Reason' },
    { accessorKey: 'createdAt', header: 'Created' },
  ];

  return (
    <SuperadminGate>
      <div className="space-y-4">
        <PageHeader
          title="Superadmin Payment Attempts"
          description="Inspect retries and provider handoff attempts."
        />
        <DataTable
          columns={columns}
          data={rows}
          loading={query.isLoading}
          error={query.isError ? 'Unable to load payment attempts.' : null}
          onRetry={() => query.refetch()}
          searchPlaceholder="Search by payment / status / reason"
        />
      </div>
    </SuperadminGate>
  );
}
