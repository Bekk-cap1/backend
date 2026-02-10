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

type BookingRow = {
  id: string;
  tripId: string;
  passenger: string;
  seats: number;
  amount: string;
  status: string;
};

export default function SuperadminBookingsPage() {
  const queryClient = useQueryClient();
  const [confirmToken, setConfirmToken] = useState('');

  const bookingsQuery = useQuery({
    queryKey: ['superadmin-bookings'],
    queryFn: async () => {
      const response = await adminApi(apiClient).listBookings({ pageSize: 200 });
      const data = unwrapData<{ items?: any[] }>(response);
      return data.items ?? [];
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({
      bookingId,
      action,
      reason,
    }: {
      bookingId: string;
      action: 'cancel' | 'complete';
      reason: string;
    }) =>
      action === 'cancel'
        ? adminApi(apiClient).forceCancelBooking(bookingId, { reason }, confirmToken)
        : adminApi(apiClient).forceCompleteBooking(bookingId, { reason }, confirmToken),
    onSuccess: () => {
      appToast.success('Booking updated');
      queryClient.invalidateQueries({ queryKey: ['superadmin-bookings'] });
    },
    onError: () => appToast.error('Booking action failed'),
  });

  const rows = useMemo<BookingRow[]>(
    () =>
      (bookingsQuery.data ?? []).map((item: any) => ({
        id: item.id,
        tripId: item.tripId,
        passenger: item.passenger?.phone ?? item.passengerId ?? '-',
        seats: item.seats ?? 0,
        amount: `${item.price ?? 0} ${item.currency ?? 'UZS'}`,
        status: item.status ?? 'unknown',
      })),
    [bookingsQuery.data],
  );

  const columns: Array<ColumnDef<BookingRow>> = [
    { accessorKey: 'id', header: 'Booking ID' },
    { accessorKey: 'tripId', header: 'Trip ID' },
    { accessorKey: 'passenger', header: 'Passenger' },
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
          <Button
            className="bg-rose-600 text-white"
            disabled={!confirmToken || actionMutation.isPending}
            onClick={() => {
              const reason = window.prompt('Reason (min 10 chars)') ?? '';
              if (reason.trim().length < 10) return;
              actionMutation.mutate({
                bookingId: row.original.id,
                action: 'cancel',
                reason,
              });
            }}
          >
            Cancel
          </Button>
          <Button
            className="bg-muted text-foreground"
            disabled={!confirmToken || actionMutation.isPending}
            onClick={() => {
              const reason = window.prompt('Reason (min 10 chars)') ?? '';
              if (reason.trim().length < 10) return;
              actionMutation.mutate({
                bookingId: row.original.id,
                action: 'complete',
                reason,
              });
            }}
          >
            Complete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <SuperadminGate>
      <div className="space-y-4">
        <PageHeader
          title="Superadmin Bookings"
          description="Force-cancel and complete disputed bookings."
        />
        <SuperadminConfirmBar
          confirmToken={confirmToken}
          setConfirmToken={setConfirmToken}
        />
        <DataTable
          columns={columns}
          data={rows}
          loading={bookingsQuery.isLoading}
          error={bookingsQuery.isError ? 'Unable to load bookings.' : null}
          onRetry={() => bookingsQuery.refetch()}
          searchPlaceholder="Search bookings"
        />
      </div>
    </SuperadminGate>
  );
}
