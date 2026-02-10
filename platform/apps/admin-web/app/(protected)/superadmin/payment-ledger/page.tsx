'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { adminApi } from '@platform/api-client';
import { apiClient } from '../../../../lib/api';
import { unwrapData } from '../../../../lib/unwrap';
import { PageHeader } from '../../../../components/shared/page-header';
import { DataTable } from '../../../../components/shared/data-table';
import { SuperadminGate } from '../../../../components/shared/superadmin-gate';

type LedgerRow = {
  id: string;
  paymentId: string;
  bookingId: string;
  entryType: string;
  amount: string;
  note: string;
  createdAt: string;
};

export default function SuperadminPaymentLedgerPage() {
  const query = useQuery({
    queryKey: ['superadmin-payment-ledger'],
    queryFn: async () => {
      const response = await adminApi(apiClient).listPaymentLedger({
        pageSize: 200,
      });
      const data = unwrapData<{ items?: any[] }>(response);
      return data.items ?? [];
    },
  });

  const rows = useMemo<LedgerRow[]>(
    () =>
      (query.data ?? []).map((item: any) => ({
        id: item.id,
        paymentId: item.paymentId ?? item.payment?.id ?? '-',
        bookingId: item.bookingId ?? item.booking?.id ?? '-',
        entryType: item.entryType ?? '-',
        amount: `${item.amount ?? '-'} ${item.currency ?? ''}`.trim(),
        note: item.note ?? '-',
        createdAt: item.createdAt
          ? new Date(item.createdAt).toLocaleString()
          : '-',
      })),
    [query.data],
  );

  const columns: Array<ColumnDef<LedgerRow>> = [
    { accessorKey: 'id', header: 'Ledger ID' },
    { accessorKey: 'paymentId', header: 'Payment ID' },
    { accessorKey: 'bookingId', header: 'Booking ID' },
    { accessorKey: 'entryType', header: 'Entry Type' },
    { accessorKey: 'amount', header: 'Amount' },
    { accessorKey: 'note', header: 'Note' },
    { accessorKey: 'createdAt', header: 'Created' },
  ];

  return (
    <SuperadminGate>
      <div className="space-y-4">
        <PageHeader
          title="Superadmin Payment Ledger"
          description="Accounting ledger entries for booking and payment operations."
        />
        <DataTable
          columns={columns}
          data={rows}
          loading={query.isLoading}
          error={query.isError ? 'Unable to load payment ledger.' : null}
          onRetry={() => query.refetch()}
          searchPlaceholder="Search by payment / booking / entry type"
        />
      </div>
    </SuperadminGate>
  );
}
