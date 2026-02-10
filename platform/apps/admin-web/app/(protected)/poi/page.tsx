'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { poiApi } from '@platform/api-client';
import { isApiActionAvailable } from '@platform/shared';
import { apiClient } from '../../../lib/api';
import { getApiErrorMessage } from '../../../lib/api-error';
import { unwrapData } from '../../../lib/unwrap';
import { PageHeader } from '../../../components/shared/page-header';
import { DataTable } from '../../../components/shared/data-table';
import { StatusPill } from '../../../components/shared/status-pill';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { ConfirmDialog } from '../../../components/ui/dialog';
import { appToast } from '../../../components/shared/toast';

type PoiRow = {
  id: string;
  type: string;
  name: string;
  lat: number;
  lon: number;
  radiusMeters: number;
  active: boolean;
};

const DEFAULT_FORM = {
  name: '',
  type: 'speed_camera',
  lat: '41.3123',
  lon: '69.2781',
  radiusMeters: '1200',
};

const POI_TYPES = [
  'speed_camera',
  'hazard',
  'police',
  'school_zone',
  'toll',
  'fuel',
  'other',
] as const;

export default function PoiPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editing, setEditing] = useState<PoiRow | null>(null);
  const [importText, setImportText] = useState(
    '[\n  {"name":"Camera #1","type":"speed_camera","lat":41.3123,"lon":69.2781}\n]',
  );

  const poiQuery = useQuery({
    queryKey: ['poi-admin'],
    queryFn: async () => {
      const response: any = await poiApi(apiClient).list();
      const data = unwrapData<any>(response);
      return data.items ?? data ?? [];
    },
    enabled: isApiActionAvailable('poi.list'),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const lat = Number(form.lat);
      const lon = Number(form.lon);
      const radiusMeters = Number(form.radiusMeters);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(radiusMeters)) {
        throw new Error('Coordinates and radius must be valid numbers');
      }
      if (!POI_TYPES.includes(form.type as (typeof POI_TYPES)[number])) {
        throw new Error(`Invalid POI type: ${form.type}`);
      }
      return poiApi(apiClient).create({
        name: form.name,
        type: form.type,
        lat,
        lon,
        radiusMeters,
        isActive: true,
      });
    },
    onSuccess: () => {
      appToast.success('POI created');
      queryClient.invalidateQueries({ queryKey: ['poi-admin'] });
      setForm(DEFAULT_FORM);
    },
    onError: (error) =>
      appToast.error('Failed to create POI', getApiErrorMessage(error, 'Validation failed')),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error('No POI selected');
      const lat = Number(form.lat);
      const lon = Number(form.lon);
      const radiusMeters = Number(form.radiusMeters);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(radiusMeters)) {
        throw new Error('Coordinates and radius must be valid numbers');
      }
      if (!POI_TYPES.includes(form.type as (typeof POI_TYPES)[number])) {
        throw new Error(`Invalid POI type: ${form.type}`);
      }
      return poiApi(apiClient).update(editing.id, {
        name: form.name,
        type: form.type,
        lat,
        lon,
        radiusMeters,
      });
    },
    onSuccess: () => {
      appToast.success('POI updated');
      queryClient.invalidateQueries({ queryKey: ['poi-admin'] });
      setEditing(null);
      setForm(DEFAULT_FORM);
    },
    onError: (error) =>
      appToast.error('Failed to update POI', getApiErrorMessage(error, 'Validation failed')),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const parsed = JSON.parse(importText);
      if (!Array.isArray(parsed)) throw new Error('Import data must be array');
      return poiApi(apiClient).importCsv({ items: parsed });
    },
    onSuccess: () => {
      appToast.success('POI import completed');
      queryClient.invalidateQueries({ queryKey: ['poi-admin'] });
    },
    onError: (error) =>
      appToast.error('POI import failed', getApiErrorMessage(error, 'Invalid import payload')),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => poiApi(apiClient).remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['poi-admin'] });
      const previous = queryClient.getQueryData<any[]>(['poi-admin']);
      queryClient.setQueryData<any[]>(['poi-admin'], (old = []) => old.filter((x: any) => x.id !== id));
      return { previous };
    },
    onError: (error, _id, ctx) => {
      queryClient.setQueryData(['poi-admin'], ctx?.previous ?? []);
      appToast.error('Delete failed', getApiErrorMessage(error, 'Unable to delete POI'));
    },
    onSuccess: () => appToast.success('POI deleted'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['poi-admin'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
      poiApi(apiClient).update(id, { isActive: active }),
    onSuccess: () => {
      appToast.success('POI status changed');
      queryClient.invalidateQueries({ queryKey: ['poi-admin'] });
    },
    onError: (error) =>
      appToast.error('Toggle failed', getApiErrorMessage(error, 'Unable to update POI status')),
  });

  const rows = useMemo<PoiRow[]>(
    () =>
      (poiQuery.data ?? []).map((item: any) => ({
        id: item.id,
        type: item.type,
        name: item.name ?? item.title ?? item.id,
        lat: Number(item.lat ?? 0),
        lon: Number(item.lon ?? 0),
        radiusMeters: Number(item.radiusMeters ?? 1200),
        active: item.isActive ?? true,
      })),
    [poiQuery.data],
  );

  const filteredRows = rows.filter((item) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      item.name.toLowerCase().includes(term) ||
      item.type.toLowerCase().includes(term) ||
      `${item.lat},${item.lon}`.includes(term)
    );
  });

  const columns: Array<ColumnDef<PoiRow>> = [
    { accessorKey: 'name', header: 'POI' },
    { accessorKey: 'type', header: 'Type' },
    {
      accessorKey: 'active',
      header: 'Status',
      cell: ({ row }) => <StatusPill status={row.original.active ? 'active' : 'rejected'} />,
    },
    {
      accessorKey: 'radiusMeters',
      header: 'Radius (m)',
    },
    {
      accessorKey: 'lat',
      header: 'Coordinates',
      cell: ({ row }) => {
        const coords = `${row.original.lat}, ${row.original.lon}`;
        return (
          <button
            className="text-primary underline"
            onClick={() => navigator.clipboard.writeText(coords)}
          >
            {coords}
          </button>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            className="bg-muted text-foreground"
            disabled={!isApiActionAvailable('poi.update')}
            onClick={() =>
              toggleMutation.mutate({
                id: row.original.id,
                active: !row.original.active,
              })
            }
          >
            {row.original.active ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            className="bg-muted text-foreground"
            disabled={!isApiActionAvailable('poi.update')}
            onClick={() => {
              setEditing(row.original);
              setForm({
                name: row.original.name,
                type: row.original.type,
                lat: String(row.original.lat),
                lon: String(row.original.lon),
                radiusMeters: String(row.original.radiusMeters),
              });
            }}
          >
            Edit
          </Button>
          <Button
            className="bg-rose-600 text-white"
            disabled={!isApiActionAvailable('poi.delete')}
            onClick={() => setConfirmDelete(row.original.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="POI"
        description="CRUD and import of radar points with coordinates management."
      />

      <div className="grid gap-3 rounded-md border p-3 lg:grid-cols-6">
        <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="Name" />
        <select
          className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
          value={form.type}
          onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}
        >
          {POI_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <Input value={form.lat} onChange={(e) => setForm((s) => ({ ...s, lat: e.target.value }))} placeholder="Lat" />
        <Input value={form.lon} onChange={(e) => setForm((s) => ({ ...s, lon: e.target.value }))} placeholder="Lon" />
        <Input value={form.radiusMeters} onChange={(e) => setForm((s) => ({ ...s, radiusMeters: e.target.value }))} placeholder="Radius" />
        <div className="flex gap-2">
          <Button
            disabled={!isApiActionAvailable('poi.create') || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Create
          </Button>
          <Button
            className="bg-muted text-foreground"
            disabled={!editing || !isApiActionAvailable('poi.update') || updateMutation.isPending}
            onClick={() => updateMutation.mutate()}
          >
            Save
          </Button>
        </div>
        <p className="text-xs text-muted-foreground lg:col-span-6">
          Allowed types: {POI_TYPES.join(', ')}
        </p>
      </div>

      <div className="space-y-2 rounded-md border p-3">
        <label className="text-sm font-medium">Bulk import JSON items</label>
        <textarea
          className="min-h-28 w-full rounded-md border bg-background p-3 text-sm"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
        <Button
          disabled={!isApiActionAvailable('poi.import') || importMutation.isPending}
          onClick={() => importMutation.mutate()}
        >
          Import
        </Button>
      </div>

      <div className="rounded-md border p-3">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search POI" />
      </div>
      <DataTable
        columns={columns}
        data={filteredRows}
        loading={poiQuery.isLoading}
        error={poiQuery.isError ? getApiErrorMessage(poiQuery.error, 'Unable to load POIs') : null}
        onRetry={() => poiQuery.refetch()}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete POI?"
        description="Deletion is destructive and should be used carefully."
        confirmText="Delete"
        requireReason
        reasonLabel="Deletion reason"
        busy={removeMutation.isPending}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (!confirmDelete) return;
          removeMutation.mutate(confirmDelete);
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}
