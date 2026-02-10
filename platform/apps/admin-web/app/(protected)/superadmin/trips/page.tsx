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
import { appToast } from '../../../../components/shared/toast';
import { SuperadminGate } from '../../../../components/shared/superadmin-gate';
import { SuperadminConfirmBar } from '../../../../components/shared/superadmin-confirm-bar';

type TripRow = {
  id: string;
  from: string;
  to: string;
  departureAt: string;
  seats: string;
  status: string;
};

export default function SuperadminTripsPage() {
  const queryClient = useQueryClient();
  const [confirmToken, setConfirmToken] = useState('');

  const tripsQuery = useQuery({
    queryKey: ['superadmin-trips'],
    queryFn: async () => {
      const response = await adminApi(apiClient).listTrips({ pageSize: 200 });
      const data = unwrapData<{ items?: any[] }>(response);
      return data.items ?? [];
    },
  });

  const transitionMutation = useMutation({
    mutationFn: async ({
      tripId,
      action,
      reason,
    }: {
      tripId: string;
      action: 'publish' | 'start' | 'complete' | 'cancel';
      reason: string;
    }) =>
      adminApi(apiClient).forceTransitionTrip(
        tripId,
        action,
        { reason },
        confirmToken,
      ),
    onSuccess: () => {
      appToast.success('Trip action applied');
      queryClient.invalidateQueries({ queryKey: ['superadmin-trips'] });
    },
    onError: () => appToast.error('Trip action failed'),
  });

  const rows = useMemo<TripRow[]>(
    () =>
      (tripsQuery.data ?? []).map((trip: any) => ({
        id: trip.id,
        from: trip.fromCity?.name ?? trip.fromCityId ?? '-',
        to: trip.toCity?.name ?? trip.toCityId ?? '-',
        departureAt: trip.departureAt
          ? new Date(trip.departureAt).toLocaleString()
          : '-',
        seats: `${trip.seatsAvailable ?? 0}/${trip.seatsTotal ?? 0}`,
        status: trip.status ?? 'unknown',
      })),
    [tripsQuery.data],
  );

  const columns: Array<ColumnDef<TripRow>> = [
    { accessorKey: 'id', header: 'Trip ID' },
    { accessorKey: 'from', header: 'From' },
    { accessorKey: 'to', header: 'To' },
    { accessorKey: 'departureAt', header: 'Departure' },
    { accessorKey: 'seats', header: 'Seats' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusPill status={row.original.status} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          {(['publish', 'start', 'complete', 'cancel'] as const).map((action) => (
            <Button
              key={action}
              className={action === 'cancel' ? 'bg-rose-600 text-white' : 'bg-muted text-foreground'}
              disabled={!confirmToken || transitionMutation.isPending}
              onClick={() => {
                const reason = window.prompt('Reason (min 10 chars)') ?? '';
                if (reason.trim().length < 10) return;
                transitionMutation.mutate({
                  tripId: row.original.id,
                  action,
                  reason,
                });
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
          title="Superadmin Trips"
          description="Force state transitions for dispute resolution."
        />
        <SuperadminConfirmBar
          confirmToken={confirmToken}
          setConfirmToken={setConfirmToken}
        />
        <DataTable
          columns={columns}
          data={rows}
          loading={tripsQuery.isLoading}
          error={tripsQuery.isError ? 'Unable to load trips.' : null}
          onRetry={() => tripsQuery.refetch()}
          searchPlaceholder="Search trips"
        />
      </div>
    </SuperadminGate>
  );
}
