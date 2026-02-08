'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '@platform/api-client';
import { apiClient } from '../../../../lib/api';
import { unwrapData } from '../../../../lib/unwrap';
import { PageHeader } from '../../../../components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { StatusPill } from '../../../../components/shared/status-pill';
import { Button } from '../../../../components/ui/button';
import { appToast } from '../../../../components/shared/toast';

export default function PaymentDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? '');
  const queryClient = useQueryClient();

  const paymentQuery = useQuery({
    queryKey: ['payment-details', id],
    queryFn: async () => {
      const response: unknown = await paymentsApi(apiClient).listAdmin({ paymentId: id });
      const data = unwrapData<{ items?: Record<string, unknown>[] }>(response);
      return data.items ?? [];
    },
    enabled: id.length > 0,
  });

  const payment = useMemo(
    () => (paymentQuery.data ?? []).find((entry) => String(entry.id ?? '') === id),
    [paymentQuery.data, id],
  );

  const markPaidMutation = useMutation({
    mutationFn: async () => paymentsApi(apiClient).markPaid(id),
    onSuccess: () => {
      appToast.success('Payment marked as paid');
      queryClient.invalidateQueries({ queryKey: ['payment-details', id] });
    },
    onError: () => appToast.error('Failed to mark payment as paid'),
  });

  return (
    <div className="space-y-4">
      <PageHeader title={`Payment ${id.slice(0, 8)}`} description="Payment timeline and actions." />
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>Amount: {String(payment?.amount ?? '-')} {String(payment?.currency ?? '')}</div>
          <div>Provider: {String(payment?.provider ?? '-')}</div>
          <div className="flex items-center gap-2">
            Status:
            <StatusPill status={String(payment?.status ?? 'pending')} />
          </div>
          <Button onClick={() => markPaidMutation.mutate()}>Mark paid</Button>
        </CardContent>
      </Card>
    </div>
  );
}

