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

type OtpRow = {
  id: string;
  phone: string;
  purpose: string;
  attempts: number;
  consumed: string;
  expiresAt: string;
  createdAt: string;
};

export default function SuperadminOtpCodesPage() {
  const query = useQuery({
    queryKey: ['superadmin-otp-codes'],
    queryFn: async () => {
      const response = await adminApi(apiClient).listOtpCodes({ pageSize: 200 });
      const data = unwrapData<{ items?: any[] }>(response);
      return data.items ?? [];
    },
  });

  const rows = useMemo<OtpRow[]>(
    () =>
      (query.data ?? []).map((item: any) => ({
        id: item.id,
        phone: String(item.phone ?? '-'),
        purpose: item.purpose ?? 'unknown',
        attempts: Number(item.attempts ?? 0),
        consumed: item.consumedAt ? 'yes' : 'no',
        expiresAt: item.expiresAt
          ? new Date(item.expiresAt).toLocaleString()
          : '-',
        createdAt: item.createdAt
          ? new Date(item.createdAt).toLocaleString()
          : '-',
      })),
    [query.data],
  );

  const columns: Array<ColumnDef<OtpRow>> = [
    { accessorKey: 'phone', header: 'Phone' },
    {
      accessorKey: 'id',
      header: 'OTP Ref',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.id.slice(0, 8)}
        </span>
      ),
    },
    {
      accessorKey: 'purpose',
      header: 'Purpose',
      cell: ({ row }) => <StatusPill status={row.original.purpose} />,
    },
    { accessorKey: 'attempts', header: 'Attempts' },
    {
      accessorKey: 'consumed',
      header: 'Consumed',
      cell: ({ row }) => <StatusPill status={row.original.consumed} />,
    },
    { accessorKey: 'expiresAt', header: 'Expires' },
    { accessorKey: 'createdAt', header: 'Created' },
  ];

  return (
    <SuperadminGate>
      <div className="space-y-4">
        <PageHeader
          title="Superadmin OTP Codes"
          description="Inspect OTP lifecycle for fraud and abuse diagnostics."
        />
        <DataTable
          columns={columns}
          data={rows}
          loading={query.isLoading}
          error={query.isError ? 'Unable to load OTP records.' : null}
          onRetry={() => query.refetch()}
          searchPlaceholder="Search by phone / purpose"
        />
      </div>
    </SuperadminGate>
  );
}
