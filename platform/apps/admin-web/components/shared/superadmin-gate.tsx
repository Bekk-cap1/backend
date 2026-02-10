'use client';

import { useEffect, useState, type ReactNode } from 'react';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const row = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!row) return null;
  return decodeURIComponent(row.slice(prefix.length));
}

export function SuperadminGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const role = (getCookie('user_role') ?? '').toLowerCase();
    setAllowed(role === 'superadmin');
    setReady(true);
  }, []);

  if (!ready) {
    return <div className="rounded-md border p-4 text-sm text-muted-foreground">Checking role...</div>;
  }

  if (!allowed) {
    return (
      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
        Superadmin role required for this section.
      </div>
    );
  }

  return <>{children}</>;
}
