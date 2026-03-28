'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { bookingsApi } from '@platform/api-client';
import { apiClient } from '../../../lib/api';
import { unwrapData } from '../../../lib/unwrap';
import { PageHeader } from '../../../components/shared/page-header';
import { DataTable } from '../../../components/shared/data-table';
import { StatusPill } from '../../../components/shared/status-pill';
import { EntityLabel } from '../../../components/shared/entity-label';

type BookingRow = {
  id: string;
  tripId: string;
  passengerId: string;
  status: string;
  seats: number;
};

export default function BookingsPage() {
  const bookingsQuery = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: async () => {
      const response: unknown = await bookingsApi(apiClient).driverAlias();
      const data = unwrapData<{ items?: Record<string, unknown>[] }>(response);
      return data.items ?? [];
    },
  });

  const rows = useMemo<BookingRow[]>(
    () =>
      (bookingsQuery.data ?? []).map((item) => ({
        id: String(item.id ?? ''),
        tripId: String(item.tripId ?? ''),
        passengerId: String(item.passengerId ?? ''),
        status: String(item.status ?? 'unknown'),
        seats: Number(item.seats ?? 0),
      })),
    [bookingsQuery.data],
  );

  const columns: Array<ColumnDef<BookingRow>> = [
    {
      accessorKey: 'id',
      header: 'Booking',
      cell: ({ row }) => (
        <Link className="text-primary hover:opacity-90" href={`/bookings/${row.original.id}`}>
          <EntityLabel
            title={`Booking #${row.original.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`}
            id={row.original.id}
          />
        </Link>
      ),
    },
    {
      accessorKey: 'tripId',
      header: 'Trip',
      cell: ({ row }) => (
        <EntityLabel
          title={
            row.original.tripId
              ? `Trip #${row.original.tripId.replace(/-/g, '').slice(0, 8).toUpperCase()}`
              : 'Trip -'
          }
          id={row.original.tripId || null}
        />
      ),
    },
    {
      accessorKey: 'passengerId',
      header: 'Passenger',
      cell: ({ row }) => (
        <EntityLabel
          title={
            row.original.passengerId
              ? `User #${row.original.passengerId.replace(/-/g, '').slice(0, 8).toUpperCase()}`
              : 'User -'
          }
          id={row.original.passengerId || null}
        />
      ),
    },
    { accessorKey: 'seats', header: 'Seats' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusPill status={row.original.status} />,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Bookings" description="Driver and passenger bookings monitor." />
      <DataTable
        columns={columns}
        data={rows}
        loading={bookingsQuery.isLoading}
        error={bookingsQuery.isError ? 'Unable to load bookings' : null}
        onRetry={() => bookingsQuery.refetch()}
      />
    </div>
  );
}

