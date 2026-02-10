'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { adminApi } from '@platform/api-client';
import { apiClient } from '../../../../lib/api';
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
  createdAt: string;
};

export default function SuperadminUsersPage() {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState('');
  const [confirmToken, setConfirmToken] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const usersQuery = useQuery({
    queryKey: ['superadmin-users'],
    queryFn: async () => {
      const response = await adminApi(apiClient).listUsers();
      const data = unwrapData<{ items?: UserRow[] }>(response);
      return data.items ?? [];
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

  const createMutation = useMutation({
    mutationFn: async () =>
      adminApi(apiClient).createUser({
        phone: newPhone,
        password: newPassword,
        role: 'passenger',
      }),
    onSuccess: () => {
      appToast.success('User created');
      setNewPhone('');
      setNewPassword('');
      queryClient.invalidateQueries({ queryKey: ['superadmin-users'] });
    },
    onError: () => appToast.error('Create failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
      adminApi(apiClient).deleteUser(id, { reason }, confirmToken),
    onSuccess: () => {
      appToast.success('User deleted');
      queryClient.invalidateQueries({ queryKey: ['superadmin-users'] });
    },
    onError: () => appToast.error('Delete failed'),
  });

  const grantMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
      adminApi(apiClient).changeUserRole(
        id,
        { role: 'superadmin', reason },
        confirmToken,
      ),
    onSuccess: () => {
      appToast.success('Role updated');
      queryClient.invalidateQueries({ queryKey: ['superadmin-users'] });
    },
    onError: () => appToast.error('Role update failed'),
  });

  const rows = useMemo(
    () =>
      (usersQuery.data ?? []).map((item) => ({
        id: item.id,
        phone: item.phone,
        role: item.role,
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString() : '-',
      })),
    [usersQuery.data],
  );

  const columns: Array<ColumnDef<UserRow>> = [
    { accessorKey: 'phone', header: 'Phone' },
    { accessorKey: 'role', header: 'Role' },
    { accessorKey: 'createdAt', header: 'CreatedAt' },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            className="bg-muted text-foreground"
            disabled={!confirmToken}
            onClick={() => {
              const reason = window.prompt('Reason (min 10 chars)') ?? '';
              if (reason.trim().length < 10) return;
              grantMutation.mutate({ id: row.original.id, reason });
            }}
          >
            Grant SUPERADMIN
          </Button>
          <Button
            className="bg-rose-600 text-white"
            disabled={!confirmToken}
            onClick={() => {
              const reason = window.prompt('Reason (min 10 chars)') ?? '';
              if (reason.trim().length < 10) return;
              deleteMutation.mutate({ id: row.original.id, reason });
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <SuperadminGate>
      <div className="space-y-4">
        <PageHeader title="Superadmin Users" description="God mode user management with re-auth confirmation." />

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
          <Button className="bg-muted text-foreground" onClick={() => setConfirmToken('')}>
            Clear token
          </Button>
        </div>

        <div className="grid gap-3 rounded-md border p-3 md:grid-cols-4">
          <Input value={newPhone} onChange={(event) => setNewPhone(event.target.value)} placeholder="New user phone" />
          <Input
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="New user password"
            type="password"
          />
          <Button onClick={() => createMutation.mutate()} disabled={!newPhone || !newPassword || createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create user'}
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          loading={usersQuery.isLoading}
          error={usersQuery.isError ? 'Unable to load users.' : null}
          onRetry={() => usersQuery.refetch()}
          searchPlaceholder="Search users"
        />
      </div>
    </SuperadminGate>
  );
}
