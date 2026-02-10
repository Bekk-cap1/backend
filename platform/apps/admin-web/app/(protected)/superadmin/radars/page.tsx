'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { adminApi } from '@platform/api-client';
import { apiClient } from '../../../../lib/api';
import { unwrapData } from '../../../../lib/unwrap';
import { PageHeader } from '../../../../components/shared/page-header';
import { DataTable } from '../../../../components/shared/data-table';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { StatusPill } from '../../../../components/shared/status-pill';
import { SuperadminGate } from '../../../../components/shared/superadmin-gate';
import { SuperadminConfirmBar } from '../../../../components/shared/superadmin-confirm-bar';
import { appToast } from '../../../../components/shared/toast';

type RadarRow = {
  id: string;
  name: string;
  type: string;
  coords: string;
  radiusMeters: number;
  isActive: boolean;
};

export default function SuperadminRadarsPage() {
  const queryClient = useQueryClient();
  const [confirmToken, setConfirmToken] = useState('');
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');

  const radarsQuery = useQuery({
    queryKey: ['superadmin-radars'],
    queryFn: async () => {
      const response = await adminApi(apiClient).listRadars({ pageSize: 200 });
      const data = unwrapData<{ items?: any[] }>(response);
      return data.items ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (reason: string) =>
      adminApi(apiClient).createRadar(
        {
          name,
          lat: Number(lat),
          lon: Number(lon),
          reason,
        },
        confirmToken,
      ),
    onSuccess: () => {
      appToast.success('Radar created');
      setName('');
      setLat('');
      setLon('');
      queryClient.invalidateQueries({ queryKey: ['superadmin-radars'] });
    },
    onError: () => appToast.error('Create radar failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
      adminApi(apiClient).deleteRadar(id, { reason }, confirmToken),
    onSuccess: () => {
      appToast.success('Radar deleted');
      queryClient.invalidateQueries({ queryKey: ['superadmin-radars'] });
    },
    onError: () => appToast.error('Delete radar failed'),
  });

  const rows = useMemo<RadarRow[]>(
    () =>
      (radarsQuery.data ?? []).map((item: any) => ({
        id: item.id,
        name: item.name ?? '-',
        type: item.type ?? 'speed_camera',
        coords: `${item.lat?.toFixed?.(5) ?? item.lat}, ${item.lon?.toFixed?.(5) ?? item.lon}`,
        radiusMeters: item.radiusMeters ?? 0,
        isActive: Boolean(item.isActive),
      })),
    [radarsQuery.data],
  );

  const columns: Array<ColumnDef<RadarRow>> = [
    { accessorKey: 'id', header: 'Radar ID' },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'type', header: 'Type' },
    { accessorKey: 'coords', header: 'Coordinates' },
    { accessorKey: 'radiusMeters', header: 'Radius (m)' },
    {
      accessorKey: 'isActive',
      header: 'Active',
      cell: ({ row }) => (
        <StatusPill status={row.original.isActive ? 'active' : 'inactive'} />
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          className="bg-rose-600 text-white"
          disabled={!confirmToken || deleteMutation.isPending}
          onClick={() => {
            const reason = window.prompt('Reason (min 10 chars)') ?? '';
            if (reason.trim().length < 10) return;
            deleteMutation.mutate({ id: row.original.id, reason });
          }}
        >
          Delete
        </Button>
      ),
    },
  ];

  const canCreate =
    confirmToken.length > 0 && name.trim().length >= 2 && lat.trim() && lon.trim();

  return (
    <SuperadminGate>
      <div className="space-y-4">
        <PageHeader title="Superadmin Radars" description="Manage radar POIs." />
        <SuperadminConfirmBar
          confirmToken={confirmToken}
          setConfirmToken={setConfirmToken}
        />

        <div className="grid gap-3 rounded-md border p-3 md:grid-cols-5">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Radar name"
          />
          <Input
            value={lat}
            onChange={(event) => setLat(event.target.value)}
            placeholder="Lat"
          />
          <Input
            value={lon}
            onChange={(event) => setLon(event.target.value)}
            placeholder="Lon"
          />
          <Button
            disabled={!canCreate || createMutation.isPending}
            onClick={() => {
              const reason = window.prompt('Reason (min 10 chars)') ?? '';
              if (reason.trim().length < 10) return;
              createMutation.mutate(reason);
            }}
          >
            {createMutation.isPending ? 'Creating...' : 'Create radar'}
          </Button>
          <Button
            className="bg-muted text-foreground"
            onClick={async () => {
              try {
                const exported = await adminApi(apiClient).exportRadars();
                const blob = new Blob([JSON.stringify(exported, null, 2)], {
                  type: 'application/json',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'radars-export.json';
                a.click();
                URL.revokeObjectURL(url);
              } catch {
                appToast.error('Export failed');
              }
            }}
          >
            Export
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          loading={radarsQuery.isLoading}
          error={radarsQuery.isError ? 'Unable to load radars.' : null}
          onRetry={() => radarsQuery.refetch()}
          searchPlaceholder="Search radars"
        />
      </div>
    </SuperadminGate>
  );
}
