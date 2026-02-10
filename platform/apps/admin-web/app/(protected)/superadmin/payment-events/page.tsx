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

type EventRow = {
  id: string;
  paymentId: string;
  provider: string;
  type: string;
  dedupeKey: string;
  receivedAt: string;
};

export default function SuperadminPaymentEventsPage() {
  const query = useQuery({
    queryKey: ['superadmin-payment-events'],
    queryFn: async () => {
      const response = await adminApi(apiClient).listPaymentEvents({
        pageSize: 200,
      });
      const data = unwrapData<{ items?: any[] }>(response);
      return data.items ?? [];
    },
  });

  const rows = useMemo<EventRow[]>(
    () =>
      (query.data ?? []).map((item: any) => ({
        id: item.id,
        paymentId: item.paymentId ?? item.payment?.id ?? '-',
        provider: item.provider ?? 'unknown',
        type: item.type ?? '-',
        dedupeKey: item.dedupeKey ?? '-',
        receivedAt: item.receivedAt
          ? new Date(item.receivedAt).toLocaleString()
          : '-',
      })),
    [query.data],
  );

  const columns: Array<ColumnDef<EventRow>> = [
    { accessorKey: 'id', header: 'Event ID' },
    { accessorKey: 'paymentId', header: 'Payment ID' },
    {
      accessorKey: 'provider',
      header: 'Provider',
      cell: ({ row }) => <StatusPill status={row.original.provider} />,
    },
    { accessorKey: 'type', header: 'Type' },
    { accessorKey: 'dedupeKey', header: 'Dedupe Key' },
    { accessorKey: 'receivedAt', header: 'Received' },
  ];

  return (
    <SuperadminGate>
      <div className="space-y-4">
        <PageHeader
          title="Superadmin Payment Events"
          description="Inspect raw webhook/provider events and dedupe keys."
        />
        <DataTable
          columns={columns}
          data={rows}
          loading={query.isLoading}
          error={query.isError ? 'Unable to load payment events.' : null}
          onRetry={() => query.refetch()}
          searchPlaceholder="Search by provider / type / payment"
        />
      </div>
    </SuperadminGate>
  );
}
