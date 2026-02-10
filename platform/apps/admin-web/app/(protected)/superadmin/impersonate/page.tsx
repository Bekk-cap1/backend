'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { adminApi } from '@platform/api-client';
import { apiClient, tokenStore } from '../../../../lib/api';
import { unwrapData } from '../../../../lib/unwrap';
import { PageHeader } from '../../../../components/shared/page-header';
import { DataTable } from '../../../../components/shared/data-table';
import { Input } from '../../../../components/ui/input';
import { Button } from '../../../../components/ui/button';
import { SuperadminGate } from '../../../../components/shared/superadmin-gate';
import { appToast } from '../../../../components/shared/toast';

type UserRow = {
  id: string;
  phone: string;
  role: string;
};

export default function SuperadminImpersonatePage() {
  const [password, setPassword] = useState('');
  const [confirmToken, setConfirmToken] = useState('');
  const [search, setSearch] = useState('');

  const usersQuery = useQuery({
    queryKey: ['impersonate-users', search],
    queryFn: async () => {
      const response = await adminApi(apiClient).listUsers();
      const data = unwrapData<{ items?: any[] }>(response);
      return (data.items ?? []).filter((item) =>
        String(item.phone ?? '')
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      );
    },
  });

  const reauthMutation = useMutation({
    mutationFn: async () => adminApi(apiClient).reauth({ password }),
    onSuccess: (result: any) => {
      const token = unwrapData<{ confirmToken?: string }>(result).confirmToken ?? '';
      setConfirmToken(token);
      appToast.success('Re-auth completed');
    },
    onError: () => appToast.error('Re-auth failed'),
  });

  const impersonateMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) =>
      adminApi(apiClient).impersonate({ userId, reason }, confirmToken),
    onSuccess: async (result: any) => {
      const payload = unwrapData<{
        accessToken: string;
        impersonatedUserId: string;
      }>(result);
      const current = await tokenStore.getAccessToken();
      if (current) window.localStorage.setItem('pre_impersonation_access_token', current);
      await tokenStore.setTokens({ accessToken: payload.accessToken });
      window.localStorage.setItem('impersonating_user_id', payload.impersonatedUserId);
      appToast.success('Impersonation started');
    },
    onError: () => appToast.error('Impersonation failed'),
  });

  const stopMutation = useMutation({
    mutationFn: async () =>
      adminApi(apiClient).stopImpersonation({ reason: 'Stopping impersonation session' }),
    onSuccess: async () => {
      const previous = window.localStorage.getItem('pre_impersonation_access_token');
      if (previous) {
        await tokenStore.setTokens({ accessToken: previous });
      }
      window.localStorage.removeItem('impersonating_user_id');
      window.localStorage.removeItem('pre_impersonation_access_token');
      appToast.success('Impersonation stopped');
    },
    onError: () => appToast.error('Stop impersonation failed'),
  });

  const rows: UserRow[] = useMemo(
    () =>
      (usersQuery.data ?? []).map((item: any) => ({
        id: item.id,
        phone: item.phone ?? '-',
        role: item.role ?? '-',
      })),
    [usersQuery.data],
  );

  const columns: Array<ColumnDef<UserRow>> = [
    { accessorKey: 'phone', header: 'Phone' },
    { accessorKey: 'role', header: 'Role' },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          disabled={!confirmToken || row.original.role === 'superadmin' || impersonateMutation.isPending}
          onClick={() => {
            const reason = window.prompt('Reason (min 10 chars)') ?? '';
            if (reason.trim().length < 10) return;
            impersonateMutation.mutate({ userId: row.original.id, reason });
          }}
        >
          Login as user
        </Button>
      ),
    },
  ];

  return (
    <SuperadminGate>
      <div className="space-y-4">
        <PageHeader title="Impersonation" description="Support flow: login as user with explicit reason and audit trace." />

        <div className="grid gap-3 rounded-md border p-3 md:grid-cols-4">
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Confirm your password"
          />
          <Button onClick={() => reauthMutation.mutate()} disabled={!password || reauthMutation.isPending}>
            {reauthMutation.isPending ? 'Re-auth...' : 'Get Confirm Token'}
          </Button>
          <Input value={confirmToken} readOnly placeholder="X-Admin-Confirm token" />
          <Button className="bg-muted text-foreground" onClick={() => stopMutation.mutate()}>
            Stop impersonation
          </Button>
        </div>

        <div className="rounded-md border p-3">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search user by phone" />
        </div>

        <DataTable
          columns={columns}
          data={rows}
          loading={usersQuery.isLoading}
          error={usersQuery.isError ? 'Unable to load users.' : null}
          onRetry={() => usersQuery.refetch()}
          searchPlaceholder="Search table"
        />
      </div>
    </SuperadminGate>
  );
}
