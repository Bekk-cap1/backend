'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { poiApi } from '@platform/api-client';
import { isApiActionAvailable } from '@platform/shared';
import { apiClient } from '../../../lib/api';
import { unwrapData } from '../../../lib/unwrap';
import { PageHeader } from '../../../components/shared/page-header';
import { DataTable } from '../../../components/shared/data-table';
import { StatusPill } from '../../../components/shared/status-pill';
import { Button } from '../../../components/ui/button';
import { appToast } from '../../../components/shared/toast';

export default function PoiReportsPage() {
  const queryClient = useQueryClient();
  const reportsQuery = useQuery({
    queryKey: ['poi-reports'],
    queryFn: async () => {
      const response: any = await poiApi(apiClient).listReports();
      const data = unwrapData<{ items?: any[] }>(response);
      return data.items ?? [];
    },
    enabled: isApiActionAvailable('poi.reports'),
  });

  const mutation = useMutation({
    mutationFn: async ({ id, mode }: { id: string; mode: 'approve' | 'reject' }) => {
      if (mode === 'approve') return poiApi(apiClient).approveReport(id);
      return poiApi(apiClient).rejectReport(id);
    },
    onSuccess: () => {
      appToast.success('Report status updated');
      queryClient.invalidateQueries({ queryKey: ['poi-reports'] });
    },
    onError: () => appToast.error('Failed to update report'),
  });

  const rows = useMemo(
    () =>
      (reportsQuery.data ?? []).map((item: any) => ({
        id: item.id,
        type: item.type ?? '-',
        status: item.status ?? 'pending',
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString() : '-',
      })),
    [reportsQuery.data],
  );

  const columns: Array<ColumnDef<any>> = [
    { accessorKey: 'type', header: 'Type' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusPill status={row.original.status} /> },
    { accessorKey: 'createdAt', header: 'CreatedAt' },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            disabled={!isApiActionAvailable('poi.report.approve')}
            onClick={() => mutation.mutate({ id: row.original.id, mode: 'approve' })}
          >
            Approve
          </Button>
          <Button
            className="bg-rose-600 text-white"
            disabled={!isApiActionAvailable('poi.report.reject')}
            onClick={() => mutation.mutate({ id: row.original.id, mode: 'reject' })}
          >
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="POI Reports" description="Community report moderation workflow." />
      <DataTable
        columns={columns}
        data={rows}
        loading={reportsQuery.isLoading}
        error={reportsQuery.isError ? 'Unable to load reports' : null}
        onRetry={() => reportsQuery.refetch()}
      />
    </div>
  );
}
