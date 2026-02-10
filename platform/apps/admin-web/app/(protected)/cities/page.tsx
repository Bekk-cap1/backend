'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { citiesApi } from '@platform/api-client';
import { apiClient } from '../../../lib/api';
import { unwrapData } from '../../../lib/unwrap';
import { getApiErrorMessage } from '../../../lib/api-error';
import { PageHeader } from '../../../components/shared/page-header';
import { DataTable } from '../../../components/shared/data-table';
import { StatusPill } from '../../../components/shared/status-pill';
import { appToast } from '../../../components/shared/toast';
import { useDebouncedValue } from '../../../hooks/use-debounced-value';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { ConfirmDialog } from '../../../components/ui/dialog';

type CityRow = {
  id: string;
  name: string;
  countryCode: string;
  region?: string | null;
  timezone?: string | null;
  isActive: boolean;
  territoryRadiusKm: number;
  lat?: number | null;
  lon?: number | null;
  createdAt?: string;
};

type CityForm = {
  name: string;
  countryCode: string;
  region: string;
  timezone: string;
  lat: string;
  lon: string;
  territoryRadiusKm: string;
  isActive: boolean;
};

type CitySuggestion = {
  sourceId: string;
  name: string;
  countryCode: string;
  region?: string | null;
  timezone?: string | null;
  lat: number;
  lon: number;
  displayName: string;
};

const defaultForm: CityForm = {
  name: '',
  countryCode: 'UZ',
  region: '',
  timezone: 'Asia/Tashkent',
  lat: '',
  lon: '',
  territoryRadiusKm: '80',
  isActive: true,
};

function toBody(form: CityForm) {
  const lat = form.lat.trim() === '' ? undefined : Number(form.lat);
  const lon = form.lon.trim() === '' ? undefined : Number(form.lon);
  const territoryRadiusKm =
    form.territoryRadiusKm.trim() === '' ? undefined : Number(form.territoryRadiusKm);

  return {
    name: form.name.trim(),
    countryCode: form.countryCode.trim().toUpperCase() || 'UZ',
    region: form.region.trim() || undefined,
    timezone: form.timezone.trim() || undefined,
    isActive: form.isActive,
    territoryRadiusKm:
      territoryRadiusKm && Number.isFinite(territoryRadiusKm)
        ? territoryRadiusKm
        : undefined,
    lat: lat !== undefined && Number.isFinite(lat) ? lat : undefined,
    lon: lon !== undefined && Number.isFinite(lon) ? lon : undefined,
  };
}

function toForm(city: CityRow): CityForm {
  return {
    name: city.name ?? '',
    countryCode: city.countryCode ?? 'UZ',
    region: city.region ?? '',
    timezone: city.timezone ?? 'Asia/Tashkent',
    lat: city.lat == null ? '' : String(city.lat),
    lon: city.lon == null ? '' : String(city.lon),
    territoryRadiusKm:
      city.territoryRadiusKm == null ? '80' : String(city.territoryRadiusKm),
    isActive: city.isActive ?? true,
  };
}

export default function CitiesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CityForm>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const debouncedSuggestionQuery = useDebouncedValue(suggestionQuery, 350);

  const citiesQuery = useQuery({
    queryKey: ['cities-admin'],
    queryFn: async () => {
      const response = await citiesApi(apiClient).listAdmin({
        limit: 200,
        includeInactive: true,
      });
      const data = unwrapData<{ items?: CityRow[] }>(response);
      return data.items ?? [];
    },
  });

  const citySuggestionsQuery = useQuery({
    queryKey: ['cities-admin-suggest', debouncedSuggestionQuery],
    enabled: debouncedSuggestionQuery.trim().length >= 2 && !editingId,
    queryFn: async () => {
      const response = await citiesApi(apiClient).suggestAdmin({
        q: debouncedSuggestionQuery.trim(),
        limit: 8,
      });
      const data = unwrapData<{ items?: CitySuggestion[] }>(response);
      return data.items ?? [];
    },
  });

  const grouped = useMemo(() => {
    const summary = new Map<string, { total: number; active: number }>();
    for (const city of citiesQuery.data ?? []) {
      const key = city.countryCode || 'N/A';
      const item = summary.get(key) ?? { total: 0, active: 0 };
      item.total += 1;
      if (city.isActive) item.active += 1;
      summary.set(key, item);
    }
    return Array.from(summary.entries()).map(([countryCode, value]) => ({
      countryCode,
      ...value,
    }));
  }, [citiesQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = toBody(form);
      if (!body.name) {
        throw new Error('City name is required');
      }
      if (editingId) {
        return citiesApi(apiClient).updateAdmin(editingId, body);
      }
      return citiesApi(apiClient).createAdmin(body);
    },
    onSuccess: () => {
      appToast.success(editingId ? 'City updated' : 'City created');
      setForm(defaultForm);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['cities-admin'] });
    },
    onError: (error: unknown) => {
      const status =
        typeof error === 'object' && error && 'response' in error
          ? Number((error as { response?: { status?: number } }).response?.status)
          : NaN;
      if (status === 404 && editingId) {
        setEditingId(null);
        setForm(defaultForm);
        appToast.error('City not found', 'Record was removed. Switched to create mode.');
        return;
      }
      appToast.error(getApiErrorMessage(error, 'City save failed'));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: boolean }) =>
      citiesApi(apiClient).toggleAdmin(id, next),
    onSuccess: () => {
      appToast.success('City status changed');
      queryClient.invalidateQueries({ queryKey: ['cities-admin'] });
    },
    onError: (error: unknown) => {
      appToast.error(getApiErrorMessage(error, 'Unable to toggle city'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => citiesApi(apiClient).removeAdmin(id),
    onSuccess: () => {
      appToast.success('City removed');
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['cities-admin'] });
    },
    onError: (error: unknown) => {
      appToast.error(getApiErrorMessage(error, 'Unable to remove city'));
    },
  });

  const rows = useMemo(
    () =>
      (citiesQuery.data ?? []).map((city) => ({
        ...city,
        status: city.isActive ? 'active' : 'inactive',
      })),
    [citiesQuery.data],
  );

  const columns: Array<ColumnDef<(typeof rows)[number]>> = [
    { accessorKey: 'name', header: 'City' },
    { accessorKey: 'countryCode', header: 'Country' },
    { accessorKey: 'region', header: 'Region' },
    {
      accessorKey: 'territoryRadiusKm',
      header: 'Territory',
      cell: ({ row }) => `${row.original.territoryRadiusKm} km`,
    },
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
          <Button
            className="bg-muted text-foreground"
            onClick={() => {
              setEditingId(row.original.id);
              setForm(toForm(row.original));
            }}
          >
            Edit
          </Button>
          <Button
            className="bg-muted text-foreground"
            onClick={() =>
              toggleMutation.mutate({
                id: row.original.id,
                next: !row.original.isActive,
              })
            }
          >
            {row.original.isActive ? 'Disable' : 'Enable'}
          </Button>
          <Button
            className="bg-rose-600 text-white"
            onClick={() => setDeleteId(row.original.id)}
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
        title="Cities"
        description="Manage active cities and their geolocation territory."
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {editingId ? 'Edit city' : 'Create city'}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {!editingId ? (
            <div className="md:col-span-2 space-y-2">
              <Input
                placeholder="Search city and autofill fields (e.g. Tashkent)"
                value={suggestionQuery}
                onChange={(event) => setSuggestionQuery(event.target.value)}
              />
              {citySuggestionsQuery.isLoading ? (
                <div className="text-sm text-muted-foreground">Searching suggestions...</div>
              ) : null}
              {citySuggestionsQuery.isError ? (
                <div className="text-sm text-rose-600">
                  Cannot load suggestions right now
                </div>
              ) : null}
              {(citySuggestionsQuery.data?.length ?? 0) > 0 ? (
                <div className="max-h-52 space-y-2 overflow-auto rounded-md border p-2">
                  {citySuggestionsQuery.data?.map((item) => (
                    <button
                      key={item.sourceId}
                      type="button"
                      className="w-full rounded-md border px-3 py-2 text-left hover:bg-muted"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          name: item.name,
                          countryCode: item.countryCode,
                          region: item.region ?? '',
                          timezone: item.timezone ?? prev.timezone,
                          lat: String(item.lat),
                          lon: String(item.lon),
                        }));
                        setSuggestionQuery(item.displayName);
                      }}
                    >
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.displayName}</div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <Input
            placeholder="City name"
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
            }
          />
          <Input
            placeholder="Country code"
            value={form.countryCode}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, countryCode: event.target.value }))
            }
          />
          <Input
            placeholder="Region"
            value={form.region}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, region: event.target.value }))
            }
          />
          <Input
            placeholder="Timezone"
            value={form.timezone}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, timezone: event.target.value }))
            }
          />
          <Input
            placeholder="Latitude (optional)"
            value={form.lat}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, lat: event.target.value }))
            }
          />
          <Input
            placeholder="Longitude (optional)"
            value={form.lon}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, lon: event.target.value }))
            }
          />
          <Input
            placeholder="Territory radius km"
            value={form.territoryRadiusKm}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                territoryRadiusKm: event.target.value,
              }))
            }
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, isActive: event.target.checked }))
              }
            />
            Active city
          </label>
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending
                ? 'Saving...'
                : editingId
                  ? 'Update city'
                  : 'Create city'}
            </Button>
            {editingId ? (
              <Button
                className="bg-muted text-foreground"
                onClick={() => {
                  setEditingId(null);
                  setForm(defaultForm);
                }}
              >
                Cancel edit
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Country groups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {grouped.length ? (
              grouped.map((item) => (
                <div
                  key={item.countryCode}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  <b>{item.countryCode}</b>: {item.active}/{item.total} active
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No groups yet</div>
            )}
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={rows}
        loading={citiesQuery.isLoading}
        error={citiesQuery.isError ? 'Unable to load cities' : null}
        onRetry={() => citiesQuery.refetch()}
        searchPlaceholder="Search city by name/region/country"
      />

      <ConfirmDialog
        open={!!deleteId}
        title="Delete city?"
        description="This action is irreversible. If city is used by trips, delete will be blocked."
        confirmText="Delete"
        busy={deleteMutation.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          deleteMutation.mutate(deleteId);
        }}
      />
    </div>
  );
}
