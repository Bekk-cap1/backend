'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '@platform/api-client';
import { apiClient } from '../../../../lib/api';
import { unwrapData } from '../../../../lib/unwrap';
import { PageHeader } from '../../../../components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { StatusPill } from '../../../../components/shared/status-pill';
import { Button } from '../../../../components/ui/button';
import { appToast } from '../../../../components/shared/toast';

export default function TicketDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? '');
  const queryClient = useQueryClient();

  const ticketQuery = useQuery({
    queryKey: ['ticket-details', id],
    queryFn: async () => {
      const response: unknown = await ticketsApi(apiClient).listAdmin({ ticketId: id });
      const data = unwrapData<{ items?: Record<string, unknown>[] }>(response);
      return data.items ?? [];
    },
    enabled: id.length > 0,
  });

  const ticket = useMemo(
    () => (ticketQuery.data ?? []).find((entry) => String(entry.id ?? '') === id),
    [ticketQuery.data, id],
  );

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => ticketsApi(apiClient).updateStatus(id, { status }),
    onSuccess: () => {
      appToast.success('Ticket status updated');
      queryClient.invalidateQueries({ queryKey: ['ticket-details', id] });
    },
    onError: () => appToast.error('Ticket update failed'),
  });

  return (
    <div className="space-y-4">
      <PageHeader title={`Ticket ${id.slice(0, 8)}`} description="Support ticket details." />
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>Subject: {String(ticket?.subject ?? '-')}</div>
          <div>Category: {String(ticket?.category ?? '-')}</div>
          <div className="flex items-center gap-2">
            Status:
            <StatusPill status={String(ticket?.status ?? 'open')} />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => updateStatusMutation.mutate('in_progress')}>In progress</Button>
            <Button className="bg-muted text-foreground" onClick={() => updateStatusMutation.mutate('resolved')}>
              Resolve
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

