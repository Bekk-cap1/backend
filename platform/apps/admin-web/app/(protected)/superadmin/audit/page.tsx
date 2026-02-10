'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { adminApi } from '@platform/api-client';
import { apiClient } from '../../../../lib/api';
import { unwrapData } from '../../../../lib/unwrap';
import { PageHeader } from '../../../../components/shared/page-header';
import { DataTable } from '../../../../components/shared/data-table';
import { Input } from '../../../../components/ui/input';
import { Button } from '../../../../components/ui/button';
import { SuperadminGate } from '../../../../components/shared/superadmin-gate';

type AuditRow = {
  id: string;
  action: string;
  actorId: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  impersonated: string;
};

export default function SuperadminAuditPage() {
  const [actorId, setActorId] = useState('');
  const [action, setAction] = useState('');
  const [impersonated, setImpersonated] = useState('');

  const auditQuery = useQuery({
    queryKey: ['superadmin-audit', actorId, action, impersonated],
    queryFn: async () => {
      const response = await adminApi(apiClient).listAudit({
        actorId: actorId || undefined,
        action: action || undefined,
        impersonated: impersonated === '' ? undefined : impersonated === 'true',
      });
      const data = unwrapData<{ items?: any[] }>(response);
      return data.items ?? [];
    },
  });

  const rows: AuditRow[] = useMemo(
    () =>
      (auditQuery.data ?? []).map((item: any) => ({
        id: item.id,
        action: item.action ?? '-',
        actorId: item.actorId ?? '-',
        entityType: item.entityType ?? '-',
        entityId: item.entityId ?? '-',
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString() : '-',
        impersonated:
          item.metadata?._context?.impersonated === true ? 'yes' : 'no',
      })),
    [auditQuery.data],
  );

  const columns: Array<ColumnDef<AuditRow>> = [
    { accessorKey: 'action', header: 'Action' },
    { accessorKey: 'actorId', header: 'Actor' },
    { accessorKey: 'entityType', header: 'Entity' },
    { accessorKey: 'entityId', header: 'Target' },
    { accessorKey: 'impersonated', header: 'Impersonated' },
    { accessorKey: 'createdAt', header: 'CreatedAt' },
  ];

  return (
    <SuperadminGate>
      <div className="space-y-4">
        <PageHeader title="Superadmin Audit" description="Forensics-grade audit with impersonation filters." />

        <div className="grid gap-3 rounded-md border p-3 md:grid-cols-4">
          <Input value={actorId} onChange={(event) => setActorId(event.target.value)} placeholder="actorId" />
          <Input value={action} onChange={(event) => setAction(event.target.value)} placeholder="action" />
          <Input value={impersonated} onChange={(event) => setImpersonated(event.target.value)} placeholder="impersonated true/false" />
          <Button className="bg-muted text-foreground" onClick={() => auditQuery.refetch()}>
            Refresh
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          loading={auditQuery.isLoading}
          error={auditQuery.isError ? 'Unable to load audit.' : null}
          onRetry={() => auditQuery.refetch()}
          searchPlaceholder="Search audit"
        />
      </div>
    </SuperadminGate>
  );
}
