'use client';

import { ReactNode, useState } from 'react';
import { Button } from './button';
import { Input } from './input';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (reason?: string) => void;
  onClose: () => void;
  busy?: boolean;
  requireReason?: boolean;
  reasonLabel?: string;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onClose,
  busy,
  requireReason,
  reasonLabel = 'Reason',
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {requireReason ? (
          <div className="mt-3 space-y-1">
            <label className="block text-xs text-muted-foreground">{reasonLabel}</label>
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Enter reason"
            />
          </div>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button className="bg-muted text-foreground" onClick={onClose} disabled={busy}>
            {cancelText}
          </Button>
          <Button onClick={() => onConfirm(reason)} disabled={busy || (requireReason ? reason.trim().length === 0 : false)}>
            {busy ? 'Please wait...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ToastAction({ children }: { children: ReactNode }) {
  return <span className="text-sm">{children}</span>;
}
