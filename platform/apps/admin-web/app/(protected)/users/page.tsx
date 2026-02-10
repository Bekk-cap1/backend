'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { adminApi } from '@platform/api-client';
import { isApiActionAvailable } from '@platform/shared';
import { apiClient } from '../../../lib/api';
import { DataTable } from '../../../components/shared/data-table';
import { PageHeader } from '../../../components/shared/page-header';
import { StatusPill } from '../../../components/shared/status-pill';
import { ConfirmDialog } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useDebouncedValue } from '../../../hooks/use-debounced-value';
import { appToast } from '../../../components/shared/toast';
import { unwrapData } from '../../../lib/unwrap';

type UserRow = {
  id: string;
  user: string;
  emailPhone: string;
  role: string;
  status: string;
  createdAt: string;
};

const ROLE_OPTIONS = [
  'passenger',
  'driver',
  'admin',
  'moderator',
  'finance',
  'support',
  'ops',
  'superadmin',
] as const;

function hasDriverDocs(docs: unknown): boolean {
  if (!docs || typeof docs !== 'object') return false;
  const record = docs as Record<string, unknown>;
  const hasLicense =
    typeof record.licenseFrontUrl === 'string' &&
    record.licenseFrontUrl.trim().length > 0;
  const hasPassport =
    typeof record.passportFrontUrl === 'string' &&
    record.passportFrontUrl.trim().length > 0;
  return hasLicense && hasPassport;
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [roleDraftByUserId, setRoleDraftByUserId] = useState<
    Record<string, (typeof ROLE_OPTIONS)[number]>
  >({});
  const [confirm, setConfirm] = useState<{ id: string; mode: 'ban' | 'unban' } | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const usersQuery = useQuery({
    queryKey: ['users', debouncedSearch, role, status],
    queryFn: async () => {
      const response: any = await adminApi(apiClient).listUsers({
        role: role || undefined,
        isBanned: status ? status === 'banned' : undefined,
      });
      const data = unwrapData<{ items?: any[] }>(response);
      return data.items ?? [];
    },
    enabled: isApiActionAvailable('users.list'),
  });

  const banMutation = useMutation({
    mutationFn: async ({
      id,
      mode,
      reason,
    }: {
      id: string;
      mode: 'ban' | 'unban';
      reason?: string;
    }) => {
      if (mode === 'ban') return adminApi(apiClient).banUser(id, { reason: reason ?? 'Manual moderation action' });
      return adminApi(apiClient).unbanUser(id);
    },
    onSuccess: () => {
      appToast.success('User updated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => appToast.error('Operation failed'),
  });

  const roleMutation = useMutation({
    mutationFn: async ({
      id,
      role: nextRole,
    }: {
      id: string;
      role: (typeof ROLE_OPTIONS)[number];
    }) =>
      adminApi(apiClient).changeUserRole(id, { role: nextRole }),
    onSuccess: () => {
      appToast.success('Role updated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) =>
      appToast.error(
        error?.response?.data?.error?.message ??
          error?.message ??
          'Role update failed',
      ),
  });

  const rows: UserRow[] = useMemo(
    () =>
      (usersQuery.data ?? []).map((item: any) => ({
        id: item.id,
        user:
          item.profile?.fullName?.trim() ||
          item.fullName?.trim() ||
          item.phone ||
          'Unknown user',
        emailPhone: item.email ?? item.phone ?? '-',
        role: item.role ?? '-',
        status: item.isBanned ? 'banned' : 'active',
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString() : '-',
      })),
    [usersQuery.data],
  );

  const applyRoleForUser = async (row: UserRow) => {
    const nextRole =
      roleDraftByUserId[row.id] ??
      (row.role as (typeof ROLE_OPTIONS)[number]);

    if (nextRole === 'driver' && row.role !== 'driver') {
      try {
        const response: any = await adminApi(apiClient).getUser(row.id);
        const user = unwrapData<any>(response);
        const profile = user?.driverProfile;

        if (!profile) {
          appToast.error(
            'Driver profile is missing',
            'User must submit driver application first.',
          );
          return;
        }

        if (String(profile.status ?? '').toLowerCase() !== 'verified') {
          appToast.error(
            'Driver profile is not verified',
            'Verify driver documents before changing role.',
          );
          return;
        }

        if (!hasDriverDocs(profile.docs)) {
          appToast.error(
            'Driver documents are incomplete',
            'Required: license front and passport front.',
          );
          return;
        }
      } catch (error: any) {
        appToast.error(
          error?.response?.data?.error?.message ??
            error?.message ??
            'Cannot validate driver profile',
        );
        return;
      }
    }

    roleMutation.mutate({
      id: row.id,
      role: nextRole,
    });
  };

  const columns: Array<ColumnDef<UserRow>> = [
    { accessorKey: 'user', header: 'User' },
    { accessorKey: 'emailPhone', header: 'Email/Phone' },
    { accessorKey: 'role', header: 'Role' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusPill status={row.original.status} />,
    },
    { accessorKey: 'createdAt', header: 'CreatedAt' },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const isBanned = row.original.status === 'banned';
        return (
          <div className="flex gap-2">
            <Link
              className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-muted"
              href={`/users/${row.original.id}`}
            >
              View
            </Link>
            <Button
              className="bg-muted text-foreground"
              disabled={!isApiActionAvailable('users.changeRole')}
              onClick={() => applyRoleForUser(row.original)}
            >
              Apply role
            </Button>
            <select
              className="h-10 rounded-md border bg-background px-2 text-sm"
              value={
                roleDraftByUserId[row.original.id] ??
                (row.original.role as (typeof ROLE_OPTIONS)[number])
              }
              onChange={(event) =>
                setRoleDraftByUserId((prev) => ({
                  ...prev,
                  [row.original.id]: event.target.value as (typeof ROLE_OPTIONS)[number],
                }))
              }
            >
              {ROLE_OPTIONS.map((roleOption) => (
                <option key={roleOption} value={roleOption}>
                  {roleOption}
                </option>
              ))}
            </select>
            <Button
              onClick={() => setConfirm({ id: row.original.id, mode: isBanned ? 'unban' : 'ban' })}
              className={isBanned ? '' : 'bg-rose-600 text-white'}
              disabled={
                isBanned
                  ? !isApiActionAvailable('users.unban')
                  : !isApiActionAvailable('users.ban')
              }
            >
              {isBanned ? 'Unban' : 'Ban'}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Users" description="Manage users, roles and moderation status." />

      <div className="grid gap-3 rounded-md border p-3 md:grid-cols-4">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search user" />
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          <option value="">All roles</option>
          {ROLE_OPTIONS.map((roleOption) => (
            <option key={roleOption} value={roleOption}>
              {roleOption}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All statuses</option>
          <option value="active">active</option>
          <option value="banned">banned</option>
        </select>
        <Button className="bg-muted text-foreground" onClick={() => usersQuery.refetch()}>
          Refresh
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={
          rows.filter((item) => {
            const term = debouncedSearch.trim().toLowerCase();
            if (!term) return true;
            return (
              item.user.toLowerCase().includes(term) ||
              item.emailPhone.toLowerCase().includes(term)
            );
          })
        }
        loading={usersQuery.isLoading}
        error={usersQuery.isError ? 'Unable to load users.' : null}
        onRetry={() => usersQuery.refetch()}
        searchPlaceholder="Search in table"
      />

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.mode === 'ban' ? 'Ban user?' : 'Unban user?'}
        description="This is a destructive action and will be logged to audit trail."
        confirmText={confirm?.mode === 'ban' ? 'Ban' : 'Unban'}
        requireReason={confirm?.mode === 'ban'}
        reasonLabel="Moderation reason"
        onClose={() => setConfirm(null)}
        busy={banMutation.isPending}
        onConfirm={(reason) => {
          if (!confirm) return;
          banMutation.mutate({ ...confirm, reason });
          setConfirm(null);
        }}
      />
    </div>
  );
}
