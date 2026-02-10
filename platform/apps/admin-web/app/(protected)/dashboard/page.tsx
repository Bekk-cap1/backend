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

const numberFormatter = new Intl.NumberFormat('en-US');

function formatCount(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) return '--';
  return numberFormatter.format(value);
}

export default function DashboardPage() {
  const usersActiveQuery = useQuery({
    queryKey: ['dashboard', 'users', 'active'],
    queryFn: async () => {
      const response: unknown = await adminApi(apiClient).listUsers({
        isBanned: false,
        page: 1,
        pageSize: 1,
      });
      const data = unwrapData<{ total?: number }>(response);
      return Number(data.total ?? 0);
    },
    enabled: isApiActionAvailable('users.list'),
  });

  const usersBannedQuery = useQuery({
    queryKey: ['dashboard', 'users', 'banned'],
    queryFn: async () => {
      const response: unknown = await adminApi(apiClient).listUsers({
        isBanned: true,
        page: 1,
        pageSize: 1,
      });
      const data = unwrapData<{ total?: number }>(response);
      return Number(data.total ?? 0);
    },
    enabled: isApiActionAvailable('users.list'),
  });

  const pendingDriversQuery = useQuery({
    queryKey: ['dashboard', 'drivers', 'pending'],
    queryFn: async () => {
      const response: unknown = await adminApi(apiClient).listDrivers({
        status: 'pending',
        page: 1,
        pageSize: 1,
      });
      const data = unwrapData<{ total?: number }>(response);
      return Number(data.total ?? 0);
    },
    enabled: isApiActionAvailable('drivers.list'),
  });

  const openTicketsQuery = useQuery({
    queryKey: ['dashboard', 'tickets', 'open'],
    queryFn: async () => {
      const response: unknown = await adminApi(apiClient).listTickets({
        status: 'open',
        page: 1,
        pageSize: 1,
      });
      const data = unwrapData<{ total?: number }>(response);
      return Number(data.total ?? 0);
    },
    enabled: isApiActionAvailable('tickets.list'),
  });

  const inProgressTicketsQuery = useQuery({
    queryKey: ['dashboard', 'tickets', 'in-progress'],
    queryFn: async () => {
      const response: unknown = await adminApi(apiClient).listTickets({
        status: 'in_progress',
        page: 1,
        pageSize: 1,
      });
      const data = unwrapData<{ total?: number }>(response);
      return Number(data.total ?? 0);
    },
    enabled: isApiActionAvailable('tickets.list'),
  });

  const paymentsTodayQuery = useQuery({
    queryKey: ['dashboard', 'payments', 'today'],
    queryFn: async () => {
      const now = new Date();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);

      const response = await apiClient.client.get('/api/v1/admin/payments/reconciliation', {
        params: {
          from: start.toISOString(),
          to: now.toISOString(),
        },
      });
      const data = unwrapData<{
        totals?: { count?: number };
        byStatus?: Array<{ status?: string; count?: number }>;
      }>(response.data);

      const total = Number(data.totals?.count ?? 0);
      const paid =
        data.byStatus?.find((item) => item.status?.toLowerCase() === 'paid')?.count ?? 0;
      const successRate = total > 0 ? (Number(paid) / total) * 100 : 0;

      return { total, successRate };
    },
    enabled: isApiActionAvailable('payments.list'),
  });

  const healthQuery = useQuery({
    queryKey: ['dashboard', 'health'],
    queryFn: async () => {
      let backendApi = false;
      let readiness = false;

      try {
        await apiClient.client.get('/health/live');
        backendApi = true;
      } catch {
        backendApi = false;
      }

      try {
        await apiClient.client.get('/health/ready');
        readiness = true;
      } catch {
        readiness = false;
      }

      return { backendApi, readiness };
    },
  });

  const auditQuery = useQuery({
    queryKey: ['audit-recent'],
    queryFn: async () => {
      const response: unknown = await adminApi(apiClient).listAudit({ page: 1, pageSize: 10 });
      const data = unwrapData<{ items?: any[] }>(response);
      return data.items ?? [];
    },
    enabled: isApiActionAvailable('audit.list'),
  });

  const openTicketsTotal = (openTicketsQuery.data ?? 0) + (inProgressTicketsQuery.data ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Operational overview for users, drivers, payments and support."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Active Users"
          value={formatCount(usersActiveQuery.data)}
          delta={
            usersBannedQuery.data !== undefined
              ? `${formatCount(usersBannedQuery.data)} banned users`
              : undefined
          }
        />
        <KpiCard
          title="Pending Drivers"
          value={formatCount(pendingDriversQuery.data)}
          delta="Awaiting verification"
        />
        <KpiCard
          title="Open Tickets"
          value={formatCount(openTicketsTotal)}
          delta={
            openTicketsQuery.data !== undefined && inProgressTicketsQuery.data !== undefined
              ? `${formatCount(openTicketsQuery.data)} open, ${formatCount(inProgressTicketsQuery.data)} in progress`
              : undefined
          }
        />
        <KpiCard
          title="Payments Today"
          value={formatCount(paymentsTodayQuery.data?.total)}
          delta={
            paymentsTodayQuery.data
              ? `${paymentsTodayQuery.data.successRate.toFixed(1)}% paid success`
              : undefined
          }
        />
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
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    healthQuery.data?.backendApi
                      ? 'bg-cyan-100 text-cyan-900'
                      : 'bg-rose-100 text-rose-900'
                  }`}
                >
                  {healthQuery.data?.backendApi ? 'Healthy' : 'Down'}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>Postgres</span>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    healthQuery.data?.readiness
                      ? 'bg-cyan-100 text-cyan-900'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {healthQuery.data?.readiness ? 'Healthy' : 'Degraded'}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>Redis</span>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    healthQuery.data?.readiness
                      ? 'bg-cyan-100 text-cyan-900'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {healthQuery.data?.readiness ? 'Healthy' : 'Degraded'}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>Outbox Worker</span>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">
                  Monitoring
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
