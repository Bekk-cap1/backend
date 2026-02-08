'use client';

import { toast } from 'sonner';

export const appToast = {
  success: (title: string, description?: string) =>
    toast.success(title, { description }),
  error: (title: string, description?: string) =>
    toast.error(title, { description }),
  info: (title: string, description?: string) =>
    toast.message(title, { description }),
};
