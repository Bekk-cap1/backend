'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { adminApi } from '@platform/api-client';
import { apiClient } from '../../../../lib/api';
import { PageHeader } from '../../../../components/shared/page-header';
import { Input } from '../../../../components/ui/input';
import { Button } from '../../../../components/ui/button';
import { SuperadminGate } from '../../../../components/shared/superadmin-gate';
import { SuperadminConfirmBar } from '../../../../components/shared/superadmin-confirm-bar';
import { appToast } from '../../../../components/shared/toast';

export default function SuperadminNotificationsPage() {
  const [confirmToken, setConfirmToken] = useState('');
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [targetUserId, setTargetUserId] = useState('');

  const broadcastMutation = useMutation({
    mutationFn: async (reason: string) =>
      adminApi(apiClient).broadcastNotification(
        {
          title: title || undefined,
          message,
          reason,
        },
        confirmToken,
      ),
    onSuccess: () => appToast.success('Broadcast sent'),
    onError: () => appToast.error('Broadcast failed'),
  });

  const targetMutation = useMutation({
    mutationFn: async (reason: string) =>
      adminApi(apiClient).notifyUser(
        targetUserId,
        {
          title: title || undefined,
          message,
          reason,
        },
        confirmToken,
      ),
    onSuccess: () => appToast.success('User notification sent'),
    onError: () => appToast.error('User notification failed'),
  });

  const segmentMutation = useMutation({
    mutationFn: async (reason: string) =>
      adminApi(apiClient).notifySegment(
        {
          title: title || undefined,
          message,
          reason,
          roles: ['driver'],
        },
        confirmToken,
      ),
    onSuccess: () => appToast.success('Segment notification sent'),
    onError: () => appToast.error('Segment notification failed'),
  });

  const canSend = confirmToken.length > 0 && message.trim().length > 0;

  return (
    <SuperadminGate>
      <div className="space-y-4">
        <PageHeader
          title="Superadmin Notifications"
          description="Broadcast and targeted notifications with confirm-token safety."
        />
        <SuperadminConfirmBar
          confirmToken={confirmToken}
          setConfirmToken={setConfirmToken}
        />

        <div className="grid gap-3 rounded-md border p-3 md:grid-cols-3">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Optional title"
          />
          <Input
            value={targetUserId}
            onChange={(event) => setTargetUserId(event.target.value)}
            placeholder="Target userId (for personal message)"
          />
          <Input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Message"
          />
        </div>

        <div className="flex flex-wrap gap-2 rounded-md border p-3">
          <Button
            disabled={!canSend || broadcastMutation.isPending}
            onClick={() => {
              const reason = window.prompt('Reason (min 10 chars)') ?? '';
              if (reason.trim().length < 10) return;
              broadcastMutation.mutate(reason);
            }}
          >
            Broadcast all
          </Button>
          <Button
            className="bg-muted text-foreground"
            disabled={!canSend || !targetUserId || targetMutation.isPending}
            onClick={() => {
              const reason = window.prompt('Reason (min 10 chars)') ?? '';
              if (reason.trim().length < 10) return;
              targetMutation.mutate(reason);
            }}
          >
            Notify user
          </Button>
          <Button
            className="bg-muted text-foreground"
            disabled={!canSend || segmentMutation.isPending}
            onClick={() => {
              const reason = window.prompt('Reason (min 10 chars)') ?? '';
              if (reason.trim().length < 10) return;
              segmentMutation.mutate(reason);
            }}
          >
            Notify drivers segment
          </Button>
        </div>
      </div>
    </SuperadminGate>
  );
}
