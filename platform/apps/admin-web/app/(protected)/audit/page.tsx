'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@platform/api-client';
import { isApiActionAvailable } from '@platform/shared';
import { apiClient } from '../../../lib/api';
import { unwrapData } from '../../../lib/unwrap';
import { PageHeader } from '../../../components/shared/page-header';
import { DataTable } from '../../../components/shared/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { Input } from '../../../components/ui/input';
import { useDebouncedValue } from '../../../hooks/use-debounced-value';
import { Button } from '../../../components/ui/button';
import { ConfirmDialog } from '../../../components/ui/dialog';

export default function AuditPage() {
  const [search, setSearch] = useState('');
  const [selectedMetadata, setSelectedMetadata] = useState<string | null>(null);
  const debounced = useDebouncedValue(search);

  const auditQuery = useQuery({
    queryKey: ['audit', debounced],
    queryFn: async () => {
      const response: any = await adminApi(apiClient).listAudit({ search: debounced || undefined });
      const data = unwrapData<{ items?: any[] }>(response);
      return data.items ?? [];
    },
    enabled: isApiActionAvailable('audit.list'),
  });

  const rows = useMemo(
    () =>
      (auditQuery.data ?? []).map((item: any) => ({
        id: item.id,
        action: item.action,
        entityType: item.entityType,
        actorId: item.actorId ?? '-',
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString() : '-',
        metadata: JSON.stringify(item.metadata ?? {}, null, 2),
      })),
    [auditQuery.data],
  );

  const columns: Array<ColumnDef<any>> = [
    { accessorKey: 'action', header: 'Action' },
    { accessorKey: 'entityType', header: 'Entity' },
    { accessorKey: 'actorId', header: 'Actor' },
    { accessorKey: 'createdAt', header: 'CreatedAt' },
    {
      id: 'meta',
      header: 'Metadata',
      cell: ({ row }) => (
        <Button className="bg-muted text-foreground" onClick={() => setSelectedMetadata(row.original.metadata)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Audit" description="Filter audit log and inspect metadata payloads." />
      <div className="rounded-md border p-3">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by action/entity/actor" />
      </div>
      <DataTable
        columns={columns}
        data={rows}
        loading={auditQuery.isLoading}
        error={auditQuery.isError ? 'Unable to load audit log' : null}
        onRetry={() => auditQuery.refetch()}
      />

      <ConfirmDialog
        open={!!selectedMetadata}
        title="Audit metadata"
        description={selectedMetadata ?? ''}
        confirmText="Close"
        onClose={() => setSelectedMetadata(null)}
        onConfirm={() => setSelectedMetadata(null)}
      />
    </div>
  );
}
