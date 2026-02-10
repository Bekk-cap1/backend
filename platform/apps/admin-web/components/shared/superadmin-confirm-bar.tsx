'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { adminApi } from '@platform/api-client';
import { apiClient } from '../../lib/api';
import { unwrapData } from '../../lib/unwrap';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { appToast } from './toast';

type Props = {
  confirmToken: string;
  setConfirmToken: (token: string) => void;
};

export function SuperadminConfirmBar({ confirmToken, setConfirmToken }: Props) {
  const [password, setPassword] = useState('');

  const reauthMutation = useMutation({
    mutationFn: async () => adminApi(apiClient).reauth({ password }),
    onSuccess: (result: unknown) => {
      const token =
        unwrapData<{ confirmToken?: string }>(result).confirmToken ?? '';
      setConfirmToken(token);
      appToast.success('Confirm token received');
    },
    onError: () => appToast.error('Re-auth failed'),
  });

  return (
    <div className="grid gap-3 rounded-md border p-3 md:grid-cols-4">
      <Input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Confirm password"
      />
      <Button
        onClick={() => reauthMutation.mutate()}
        disabled={!password || reauthMutation.isPending}
      >
        {reauthMutation.isPending ? 'Re-auth...' : 'Get Confirm Token'}
      </Button>
      <Input value={confirmToken} readOnly placeholder="X-Admin-Confirm" />
      <Button className="bg-muted text-foreground" onClick={() => setConfirmToken('')}>
        Clear token
      </Button>
    </div>
  );
}
