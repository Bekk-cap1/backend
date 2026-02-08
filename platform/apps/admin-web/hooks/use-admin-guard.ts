'use client';

import { useMemo } from 'react';

export function useAdminGuard(role: string | null | undefined) {
  return useMemo(() => role === 'admin' || role === 'moderator', [role]);
}
