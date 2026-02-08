'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Input } from '../ui/input';
import { cn } from '../../lib/cn';

type CommandItem = { label: string; href: string; keywords: string[] };

const COMMANDS: CommandItem[] = [
  { label: 'Dashboard', href: '/dashboard', keywords: ['kpi', 'health', 'overview'] },
  { label: 'Live Ops', href: '/live', keywords: ['map', 'geo', 'eta'] },
  { label: 'Users', href: '/users', keywords: ['ban', 'role', 'moderation'] },
  { label: 'Drivers', href: '/drivers', keywords: ['verify', 'reject'] },
  { label: 'Trips', href: '/trips', keywords: ['publish', 'complete'] },
  { label: 'Bookings', href: '/bookings', keywords: ['cancel', 'complete'] },
  { label: 'Cancellations', href: '/cancellations', keywords: ['fee', 'quote'] },
  { label: 'POI', href: '/poi', keywords: ['radar', 'import'] },
  { label: 'POI Reports', href: '/poi-reports', keywords: ['report', 'approve'] },
  { label: 'Tickets', href: '/tickets', keywords: ['support'] },
  { label: 'Payments', href: '/payments', keywords: ['mark paid'] },
  { label: 'Notifications', href: '/notifications', keywords: ['alerts', 'events'] },
  { label: 'Audit', href: '/audit', keywords: ['logs'] },
  { label: 'Settings', href: '/settings', keywords: ['theme'] },
];

export function Topbar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return COMMANDS;
    return COMMANDS.filter((item) =>
      [item.label, ...item.keywords].some((entry) =>
        entry.toLowerCase().includes(term),
      ),
    );
  }, [query]);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Global search..."
          className="max-w-xl"
        />
        <button
          className="rounded-md border px-3 py-2 text-xs text-muted-foreground"
          onClick={() => setOpen(true)}
        >
          Command Palette (Ctrl+K)
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div
            className="mx-auto mt-20 max-w-xl rounded-lg border bg-card p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type a page or command"
            />
            <div className="mt-3 max-h-72 overflow-auto rounded-md border">
              {filtered.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'block border-b px-3 py-2 text-sm hover:bg-muted',
                    'last:border-b-0',
                  )}
                >
                  {item.label}
                </Link>
              ))}
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
