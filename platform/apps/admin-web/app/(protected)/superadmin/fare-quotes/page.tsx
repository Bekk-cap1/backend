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

type QuoteRow = {
  id: string;
  user: string;
  trip: string;
  seats: number;
  amount: string;
  provider: string;
  expiresAt: string;
  createdAt: string;
};

export default function SuperadminFareQuotesPage() {
  const query = useQuery({
    queryKey: ['superadmin-fare-quotes'],
    queryFn: async () => {
      const response = await adminApi(apiClient).listFareQuotes({ pageSize: 200 });
      const data = unwrapData<{ items?: any[] }>(response);
      return data.items ?? [];
    },
  });

  const rows = useMemo<QuoteRow[]>(
    () =>
      (query.data ?? []).map((item: any) => ({
        id: item.id,
        user: item.user?.phone ?? item.userId ?? '-',
        trip: item.tripId ?? item.trip?.id ?? '-',
        seats: Number(item.seats ?? 0),
        amount: `${item.amount ?? '-'} ${item.currency ?? ''}`.trim(),
        provider: item.provider ?? '-',
        expiresAt: item.expiresAt ? new Date(item.expiresAt).toLocaleString() : '-',
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString() : '-',
      })),
    [query.data],
  );

  const columns: Array<ColumnDef<QuoteRow>> = [
    { accessorKey: 'id', header: 'Quote ID' },
    { accessorKey: 'user', header: 'User' },
    { accessorKey: 'trip', header: 'Trip' },
    { accessorKey: 'seats', header: 'Seats' },
    { accessorKey: 'amount', header: 'Amount' },
    { accessorKey: 'provider', header: 'Provider' },
    { accessorKey: 'expiresAt', header: 'Expires' },
    { accessorKey: 'createdAt', header: 'Created' },
  ];

  return (
    <SuperadminGate>
      <div className="space-y-4">
        <PageHeader
          title="Superadmin Fare Quotes"
          description="Inspect generated quotes for pricing and payment checks."
        />
        <DataTable
          columns={columns}
          data={rows}
          loading={query.isLoading}
          error={query.isError ? 'Unable to load fare quotes.' : null}
          onRetry={() => query.refetch()}
          searchPlaceholder="Search by user / trip / provider"
        />
      </div>
    </SuperadminGate>
  );
}
