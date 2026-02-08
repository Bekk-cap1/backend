'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { bookingsApi, cancellationsApi } from '@platform/api-client';
import { apiClient } from '../../../lib/api';
import { unwrapData } from '../../../lib/unwrap';
import { PageHeader } from '../../../components/shared/page-header';
import { DataTable } from '../../../components/shared/data-table';
import { Button } from '../../../components/ui/button';
import { appToast } from '../../../components/shared/toast';

type Row = {
  id: string;
  tripId: string;
  status: string;
  quote?: string;
};

export default function CancellationsPage() {
  const [quotes, setQuotes] = useState<Record<string, string>>({});
  const bookingsQuery = useQuery({
    queryKey: ['cancellation-bookings'],
    queryFn: async () => {
      const response: unknown = await bookingsApi(apiClient).driverAlias();
      const data = unwrapData<{ items?: Record<string, unknown>[] }>(response);
      return data.items ?? [];
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (bookingId: string) => cancellationsApi(apiClient).apply(bookingId),
    onSuccess: () => appToast.success('Cancellation applied'),
    onError: () => appToast.error('Failed to apply cancellation'),
  });

  const rows = useMemo<Row[]>(
    () =>
      (bookingsQuery.data ?? []).map((item) => ({
        id: String(item.id ?? ''),
        tripId: String(item.tripId ?? '-'),
        status: String(item.status ?? '-'),
        quote: quotes[String(item.id ?? '')],
      })),
    [bookingsQuery.data, quotes],
  );

  const columns: Array<ColumnDef<Row>> = [
    { accessorKey: 'id', header: 'Booking ID' },
    { accessorKey: 'tripId', header: 'Trip ID' },
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'quote', header: 'Fee Quote' },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            className="bg-muted text-foreground"
            onClick={async () => {
              try {
                const response: unknown = await cancellationsApi(apiClient).quote(row.original.id);
                const data = unwrapData<Record<string, unknown>>(response);
                const fee = String(data.feeAmount ?? data.amount ?? '-');
                setQuotes((prev) => ({ ...prev, [row.original.id]: fee }));
              } catch {
                appToast.error('Cannot load cancellation quote');
              }
            }}
          >
            Quote
          </Button>
          <Button className="bg-rose-600 text-white" onClick={() => applyMutation.mutate(row.original.id)}>
            Apply
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Cancellations" description="Policy quote and cancellation fee application." />
      <DataTable
        columns={columns}
        data={rows}
        loading={bookingsQuery.isLoading}
        error={bookingsQuery.isError ? 'Unable to load bookings for cancellation' : null}
        onRetry={() => bookingsQuery.refetch()}
      />
    </div>
  );
}

