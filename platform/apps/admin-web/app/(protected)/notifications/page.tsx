'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { notificationsApi } from '@platform/api-client';
import { apiClient } from '../../../lib/api';
import { getApiErrorMessage, getApiErrorStatus } from '../../../lib/api-error';
import { unwrapData } from '../../../lib/unwrap';
import { appToast } from '../../../components/shared/toast';
import { PageHeader } from '../../../components/shared/page-header';
import { DataTable } from '../../../components/shared/data-table';
import { StatusPill } from '../../../components/shared/status-pill';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  status: string;
  createdAt: string;
  createdAtRaw: string;
  readAtRaw: string | null;
  payloadPretty: string;
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selected, setSelected] = useState<NotificationRow | null>(null);

  const notificationsQuery = useQuery({
    queryKey: ['notifications', unreadOnly],
    queryFn: async () => {
      const response: unknown = await notificationsApi(apiClient).listMine({
        limit: 100,
        offset: 0,
        unreadOnly,
      });
      const data = unwrapData<{ items?: Record<string, unknown>[] }>(response);
      return data.items ?? [];
    },
    retry: (failureCount, error) => {
      const status = getApiErrorStatus(error);
      if (status === 401 || status === 403) return false;
      return failureCount < 1;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => notificationsApi(apiClient).markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (error) =>
      appToast.error(
        'Failed to mark notification',
        getApiErrorMessage(error, 'Unable to update notification'),
      ),
  });

  const formatPayload = (payload: unknown) => {
    if (payload == null) return '-';
    if (typeof payload === 'string') return payload;
    try {
      return JSON.stringify(payload, null, 2);
    } catch {
      return String(payload);
    }
  };

  const truncate = (value: string, max = 72) => {
    if (!value) return '-';
    if (value.length <= max) return value;
    return `${value.slice(0, max)}...`;
  };

  const rows = useMemo<NotificationRow[]>(
    () =>
      (notificationsQuery.data ?? []).map((item) => ({
        id: String(item.id ?? ''),
        type: String(item.type ?? 'generic'),
        title: String(item.title ?? ''),
        message: String(item.message ?? ''),
        status: item.readAt ? 'read' : 'unread',
        createdAt: item.createdAt ? new Date(String(item.createdAt)).toLocaleString() : '-',
        createdAtRaw: item.createdAt ? String(item.createdAt) : '',
        readAtRaw: item.readAt ? String(item.readAt) : null,
        payloadPretty: formatPayload(item.payload),
      })),
    [notificationsQuery.data],
  );

  const unreadCount = rows.filter((item) => item.status === 'unread').length;
  const readCount = rows.length - unreadCount;

  const columns: Array<ColumnDef<NotificationRow>> = [
    { accessorKey: 'type', header: 'Type' },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => truncate(row.original.title || 'No title'),
    },
    {
      accessorKey: 'message',
      header: 'Message',
      cell: ({ row }) => truncate(row.original.message || 'No message', 88),
    },
    { accessorKey: 'createdAt', header: 'Created' },
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
          <Button className="bg-muted text-foreground" onClick={() => setSelected(row.original)}>
            View
          </Button>
          <Button
            className="bg-muted text-foreground"
            onClick={() => markReadMutation.mutate(row.original.id)}
            disabled={row.original.status === 'read' || markReadMutation.isPending}
          >
            Mark read
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Notifications" description="Admin event feed and acknowledgements." />

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{rows.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Unread</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{unreadCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Read</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{readCount}</CardContent>
        </Card>
      </div>

      <div className="rounded-lg border p-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(event) => setUnreadOnly(event.target.checked)}
            className="h-4 w-4 rounded border border-input bg-background"
          />
          Show unread only
        </label>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={notificationsQuery.isLoading}
        error={
          notificationsQuery.isError
            ? getApiErrorMessage(notificationsQuery.error, 'Unable to load notifications')
            : null
        }
        onRetry={() => notificationsQuery.refetch()}
      />

      {selected ? (
        <div className="fixed inset-0 z-50 bg-black/45 p-4" onClick={() => setSelected(null)}>
          <div
            className="mx-auto mt-16 max-w-3xl rounded-lg border bg-card p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">{selected.title || 'Notification details'}</h3>
                <p className="text-sm text-muted-foreground">ID: {selected.id}</p>
              </div>
              <StatusPill status={selected.status} />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="mt-1 text-sm">{selected.type}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="mt-1 text-sm">
                  {selected.createdAtRaw
                    ? new Date(selected.createdAtRaw).toLocaleString()
                    : '-'}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Read At</p>
                <p className="mt-1 text-sm">
                  {selected.readAtRaw ? new Date(selected.readAtRaw).toLocaleString() : 'Not read'}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Message</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{selected.message || '-'}</p>
            </div>

            <div className="mt-4 rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Payload (JSON)</p>
              <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded bg-background p-3 text-xs">
                {selected.payloadPretty}
              </pre>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button className="bg-muted text-foreground" onClick={() => setSelected(null)}>
                Close
              </Button>
              <Button
                onClick={() => markReadMutation.mutate(selected.id)}
                disabled={selected.status === 'read' || markReadMutation.isPending}
              >
                Mark read
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

