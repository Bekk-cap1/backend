'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@platform/api-client';
import { apiClient } from '../../../../lib/api';
import { unwrapData } from '../../../../lib/unwrap';
import { PageHeader } from '../../../../components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { StatusPill } from '../../../../components/shared/status-pill';

export default function UserDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? '');

  const usersQuery = useQuery({
    queryKey: ['user-details', id],
    queryFn: async () => {
      const response: unknown = await adminApi(apiClient).listUsers({ id });
      const data = unwrapData<{ items?: Record<string, unknown>[] }>(response);
      return data.items ?? [];
    },
    enabled: id.length > 0,
  });

  const user = useMemo(
    () => (usersQuery.data ?? []).find((entry) => String(entry.id ?? '') === id),
    [id, usersQuery.data],
  );

  return (
    <div className="space-y-4">
      <PageHeader title={`User ${id.slice(0, 8)}`} description="User profile and moderation state." />
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>Phone: {String(user?.phone ?? '-')}</div>
          <div>Email: {String(user?.email ?? '-')}</div>
          <div>Role: {String(user?.role ?? '-')}</div>
          <div className="flex items-center gap-2">
            Status:
            <StatusPill status={Boolean(user?.isBanned) ? 'banned' : 'active'} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

