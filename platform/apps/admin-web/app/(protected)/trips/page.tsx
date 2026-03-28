'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { adminApi } from '@platform/api-client';
import { apiClient } from '../../../lib/api';
import { unwrapData } from '../../../lib/unwrap';
import { PageHeader } from '../../../components/shared/page-header';
import { DataTable } from '../../../components/shared/data-table';
import { StatusPill } from '../../../components/shared/status-pill';
import { EntityLabel } from '../../../components/shared/entity-label';

type TripRow = {
  id: string;
  fromCityId: string;
  toCityId: string;
  departureAt: string;
  status: string;
};

export default function TripsPage() {
  const tripsQuery = useQuery({
    queryKey: ['admin-trips'],
    queryFn: async () => {
      const response: unknown = await adminApi(apiClient).listTrips({
        page: 1,
        pageSize: 100,
      });
      const data = unwrapData<{ items?: Record<string, unknown>[] }>(response);
      return data.items ?? [];
    },
  });

  const rows = useMemo<TripRow[]>(
    () =>
      (tripsQuery.data ?? []).map((item) => ({
        id: String(item.id ?? ''),
        fromCityId: String(item.fromCityId ?? '-'),
        toCityId: String(item.toCityId ?? '-'),
        departureAt: item.departureAt ? new Date(String(item.departureAt)).toLocaleString() : '-',
        status: String(item.status ?? 'unknown'),
      })),
    [tripsQuery.data],
  );

  const columns: Array<ColumnDef<TripRow>> = [
    {
      accessorKey: 'id',
      header: 'Trip ID',
      cell: ({ row }) => (
        <Link className="text-primary hover:opacity-90" href={`/trips/${row.original.id}`}>
          <EntityLabel title={`Trip #${row.original.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`} id={row.original.id} />
        </Link>
      ),
    },
    { accessorKey: 'fromCityId', header: 'From' },
    { accessorKey: 'toCityId', header: 'To' },
    { accessorKey: 'departureAt', header: 'Departure' },
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
          <Link
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-muted"
            href={`/trips/${row.original.id}`}
          >
            View
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Trips" description="Monitor published and active trips." />
      <DataTable
        columns={columns}
        data={rows}
        loading={tripsQuery.isLoading}
        error={tripsQuery.isError ? 'Unable to load trips' : null}
        onRetry={() => tripsQuery.refetch()}
      />
    </div>
  );
}
