'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { adminApi, paymentsApi } from '@platform/api-client';
import { isApiActionAvailable } from '@platform/shared';
import { apiClient } from '../../../lib/api';
import { unwrapData } from '../../../lib/unwrap';
import { PageHeader } from '../../../components/shared/page-header';
import { DataTable } from '../../../components/shared/data-table';
import { StatusPill } from '../../../components/shared/status-pill';
import { Button } from '../../../components/ui/button';
import { appToast } from '../../../components/shared/toast';

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const paymentsQuery = useQuery({
    queryKey: ['payments-admin'],
    queryFn: async () => {
      const response: any = await adminApi(apiClient).listPayments();
      const data = unwrapData<{ items?: any[] }>(response);
      return data.items ?? [];
    },
    enabled: isApiActionAvailable('payments.list'),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => paymentsApi(apiClient).markPaid(id),
    onSuccess: () => {
      appToast.success('Payment marked as paid');
      queryClient.invalidateQueries({ queryKey: ['payments-admin'] });
    },
    onError: () => appToast.error('Cannot mark payment as paid'),
  });

  const rows = useMemo(
    () =>
      (paymentsQuery.data ?? []).map((item: any) => ({
        id: item.id,
        amount: item.amount ?? 0,
        currency: item.currency ?? 'UZS',
        status: item.status ?? 'pending',
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString() : '-',
      })),
    [paymentsQuery.data],
  );

  const columns: Array<ColumnDef<any>> = [
    {
      accessorKey: 'id',
      header: 'Payment ID',
      cell: ({ row }) => (
        <Link className="text-primary underline" href={`/payments/${row.original.id}`}>
          {row.original.id.slice(0, 8)}
        </Link>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => `${row.original.amount} ${row.original.currency}`,
    },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusPill status={row.original.status} /> },
    { accessorKey: 'createdAt', header: 'CreatedAt' },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          disabled={!isApiActionAvailable('payments.markPaid')}
          onClick={() => markPaidMutation.mutate(row.original.id)}
        >
          Mark Paid
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Payments" description="Payment events and manual mark-paid action." />
      <DataTable
        columns={columns}
        data={rows}
        loading={paymentsQuery.isLoading}
        error={paymentsQuery.isError ? 'Unable to load payments' : null}
        onRetry={() => paymentsQuery.refetch()}
      />
    </div>
  );
}
