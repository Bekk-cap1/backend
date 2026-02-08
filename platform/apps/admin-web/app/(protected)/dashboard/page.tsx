'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@platform/api-client';
import { isApiActionAvailable } from '@platform/shared';
import { apiClient } from '../../../lib/api';
import { unwrapData } from '../../../lib/unwrap';
import { PageHeader } from '../../../components/shared/page-header';
import { KpiCard } from '../../../components/shared/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { DataTable } from '../../../components/shared/data-table';
import type { ColumnDef } from '@tanstack/react-table';

type AuditItem = {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
};

const auditColumns: Array<ColumnDef<AuditItem>> = [
  { accessorKey: 'action', header: 'Action' },
  { accessorKey: 'entityType', header: 'Entity' },
  { accessorKey: 'createdAt', header: 'Created At' },
];

export default function DashboardPage() {
  const auditQuery = useQuery({
    queryKey: ['audit-recent'],
    queryFn: async () => {
      const response: any = await adminApi(apiClient).listAudit({ page: 1, pageSize: 10 });
      const data = unwrapData<{ items?: any[] }>(response);
      return data.items ?? [];
    },
    enabled: isApiActionAvailable('audit.list'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Operational overview for users, drivers, payments and support."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Active Users" value="1,284" delta="+6.2% this week" />
        <KpiCard title="Pending Drivers" value="32" delta="7 need review today" />
        <KpiCard title="Open Tickets" value="18" delta="4 critical" />
        <KpiCard title="Payments Today" value="249" delta="95.8% success rate" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Audit</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={auditColumns}
              data={auditQuery.data ?? []}
              loading={auditQuery.isLoading}
              error={auditQuery.isError ? 'Unable to load audit feed.' : null}
              onRetry={() => auditQuery.refetch()}
              searchPlaceholder="Search audit actions"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-between">
                <span>Backend API</span>
                <span className="rounded-full bg-cyan-100 px-2 py-1 text-xs font-medium text-cyan-900">Healthy</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Postgres</span>
                <span className="rounded-full bg-cyan-100 px-2 py-1 text-xs font-medium text-cyan-900">Healthy</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Redis</span>
                <span className="rounded-full bg-cyan-100 px-2 py-1 text-xs font-medium text-cyan-900">Healthy</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Outbox Worker</span>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">Monitoring</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
