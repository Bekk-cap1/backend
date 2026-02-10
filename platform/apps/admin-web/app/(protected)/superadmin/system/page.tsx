'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@platform/api-client';
import { apiClient } from '../../../../lib/api';
import { unwrapData } from '../../../../lib/unwrap';
import { PageHeader } from '../../../../components/shared/page-header';
import { SuperadminGate } from '../../../../components/shared/superadmin-gate';

export default function SuperadminSystemPage() {
  const settingsQuery = useQuery({
    queryKey: ['superadmin-system-settings'],
    queryFn: async () => {
      const response = await adminApi(apiClient).getSystemSettings();
      return unwrapData<Record<string, unknown>>(response);
    },
  });

  const entries = Object.entries(settingsQuery.data ?? {});

  return (
    <SuperadminGate>
      <div className="space-y-4">
        <PageHeader title="Superadmin System" description="Readonly runtime settings and feature flags." />

        <div className="rounded-md border p-4">
          {settingsQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading settings...</div>
          ) : settingsQuery.isError ? (
            <div className="text-sm text-rose-500">Failed to load system settings.</div>
          ) : entries.length === 0 ? (
            <div className="text-sm text-muted-foreground">No settings available.</div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {entries.map(([key, value]) => (
                <div key={key} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{key}</div>
                  <div className="text-muted-foreground">{String(value)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SuperadminGate>
  );
}
