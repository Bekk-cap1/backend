'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeToggle } from '../../components/shared/theme-toggle';
import { Topbar } from '../../components/shared/topbar';
import { cn } from '../../lib/cn';
import { apiClient, tokenStore } from '../../lib/api';

const nav = [
  ['Dashboard', '/dashboard'],
  ['Live Ops', '/live'],
  ['Users', '/users'],
  ['Drivers', '/drivers'],
  ['Trips', '/trips'],
  ['Bookings', '/bookings'],
  ['Cancellations', '/cancellations'],
  ['POI', '/poi'],
  ['POI Reports', '/poi-reports'],
  ['Tickets', '/tickets'],
  ['Payments', '/payments'],
  ['Notifications', '/notifications'],
  ['Audit', '/audit'],
  ['Settings', '/settings'],
];

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    try {
      await apiClient.client.post('/api/auth/web/logout');
    } catch {
      // ignore logout transport errors, local cleanup still runs
    }
    await tokenStore.clear();
    document.cookie = 'admin_session=; Max-Age=0; path=/';
    document.cookie = 'csrf_token=; Max-Age=0; path=/';
    document.cookie = 'user_role=; Max-Age=0; path=/';
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-lg border bg-card p-4">
          <div className="mb-4 text-sm font-semibold text-muted-foreground">Intercity Admin</div>
          <nav className="space-y-1">
            {nav.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'block rounded-md px-3 py-2 text-sm',
                  pathname === href
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted',
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 flex flex-col gap-2">
            <ThemeToggle />
            <button className="rounded-md border px-3 py-2 text-sm" onClick={logout}>
              Logout
            </button>
          </div>
        </aside>
        <main className="rounded-lg border bg-card p-6">
          <Topbar />
          {children}
        </main>
      </div>
    </div>
  );
}
