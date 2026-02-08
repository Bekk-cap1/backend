'use client';

import Link from 'next/link';
import { PageHeader } from '../../../components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { ThemeToggle } from '../../../components/shared/theme-toggle';

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Settings" description="Theme and operational links." />

      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Useful Links</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/dashboard" className="text-primary underline">Dashboard</Link>
            </li>
            <li>
              <a href="http://localhost:3000/metrics" target="_blank" rel="noreferrer" className="text-primary underline">
                Metrics endpoint
              </a>
            </li>
            <li>
              <a href="http://localhost:3000/health/ready" target="_blank" rel="noreferrer" className="text-primary underline">
                Health check
              </a>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
