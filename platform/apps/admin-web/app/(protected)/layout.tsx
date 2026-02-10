'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeToggle } from '../../components/shared/theme-toggle';
import { Topbar } from '../../components/shared/topbar';
import { cn } from '../../lib/cn';
import { apiClient, tokenStore } from '../../lib/api';

type NavItem = { label: string; href: string; superadminOnly?: boolean };
type NavGroup = { title: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    title: 'Operations',
    items: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Live Ops', href: '/live' },
      { label: 'Users', href: '/users' },
      { label: 'Drivers', href: '/drivers' },
      { label: 'Cities', href: '/cities' },
      { label: 'Trips', href: '/trips' },
      { label: 'Bookings', href: '/bookings' },
      { label: 'Cancellations', href: '/cancellations' },
      { label: 'POI', href: '/poi' },
      { label: 'POI Reports', href: '/poi-reports' },
      { label: 'Tickets', href: '/tickets' },
      { label: 'Payments', href: '/payments' },
      { label: 'Notifications', href: '/notifications' },
      { label: 'Audit', href: '/audit' },
      { label: 'Settings', href: '/settings' },
    ],
  },
  {
    title: 'Superadmin',
    items: [
      { label: 'Users', href: '/superadmin/users', superadminOnly: true },
      { label: 'Sessions', href: '/superadmin/sessions', superadminOnly: true },
      { label: 'Devices', href: '/superadmin/devices', superadminOnly: true },
      { label: 'Trips', href: '/superadmin/trips', superadminOnly: true },
      { label: 'Bookings', href: '/superadmin/bookings', superadminOnly: true },
      { label: 'Requests', href: '/superadmin/requests', superadminOnly: true },
      { label: 'Offers', href: '/superadmin/offers', superadminOnly: true },
      { label: 'Payment Attempts', href: '/superadmin/payment-attempts', superadminOnly: true },
      { label: 'Payment Events', href: '/superadmin/payment-events', superadminOnly: true },
      { label: 'Payment Ledger', href: '/superadmin/payment-ledger', superadminOnly: true },
      { label: 'Fare Quotes', href: '/superadmin/fare-quotes', superadminOnly: true },
      { label: 'OTP Codes', href: '/superadmin/otp-codes', superadminOnly: true },
      { label: 'Radars', href: '/superadmin/radars', superadminOnly: true },
      { label: 'Outbox', href: '/superadmin/outbox', superadminOnly: true },
      { label: 'Geo Samples', href: '/superadmin/geo-samples', superadminOnly: true },
      { label: 'Notifications', href: '/superadmin/notifications', superadminOnly: true },
      { label: 'System', href: '/superadmin/system', superadminOnly: true },
      { label: 'Audit', href: '/superadmin/audit', superadminOnly: true },
      { label: 'Impersonation', href: '/superadmin/impersonate', superadminOnly: true },
    ],
  },
];

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState('');
  const [impersonatingUserId, setImpersonatingUserId] = useState('');

  useEffect(() => {
    const roleCookie = document.cookie
      .split(';')
      .map((v) => v.trim())
      .find((v) => v.startsWith('user_role='))
      ?.split('=')[1];
    setRole((roleCookie ?? '').toLowerCase());

    const imp = window.localStorage.getItem('impersonating_user_id') ?? '';
    setImpersonatingUserId(imp);
  }, []);

  const visibleGroups = useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !item.superadminOnly || role === 'superadmin'),
        }))
        .filter((group) => group.items.length > 0),
    [role],
  );

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
    window.localStorage.removeItem('impersonating_user_id');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[260px_1fr]">
        <aside className="flex flex-col rounded-lg border border-border bg-card p-4 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:[&::-webkit-scrollbar]:w-2 lg:[&::-webkit-scrollbar-thumb]:rounded-full lg:[&::-webkit-scrollbar-thumb]:bg-border">
          <div className="mb-4 text-sm font-semibold text-muted-foreground">Intercity Admin</div>
          <nav className="space-y-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1 lg:[&::-webkit-scrollbar]:w-2 lg:[&::-webkit-scrollbar-thumb]:rounded-full lg:[&::-webkit-scrollbar-thumb]:bg-border">
            {visibleGroups.map((group) => (
              <div key={group.title}>
                <div className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                  {group.title}
                </div>
                <div className="space-y-1 transition-all trandution-duration-150 ease-in-out">
                  {group.items.map(({ label, href }) => {
                    const isActive =
                      pathname === href || pathname.startsWith(`${href}/`);
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={cn(
                          'block rounded-md border px-3 py-2 text-sm transition-all transition-duration-150 ease-in-out',
                          isActive
                            ? 'border-primary border-l-4 bg-primary/15 text-foreground shadow-sm ring-1 ring-primary/30 transition-colors transition-duration-150 ease-in-out'
                            : 'border-transparent hover:border-border hover:border-l-4 hover:bg-muted/80',
                        )}
                      >
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          {impersonatingUserId ? (
            <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
              You are impersonating user <b>{impersonatingUserId}</b>
            </div>
          ) : null}
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
