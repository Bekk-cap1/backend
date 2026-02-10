'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@platform/shared';
import { useRouter } from 'next/navigation';
import { tokenStore } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { appToast } from '../../components/shared/toast';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    setError(url.searchParams.get('error'));

    // Safety: if page was submitted without JS, browser may append credentials to query.
    if (url.searchParams.has('phone') || url.searchParams.has('password')) {
      url.searchParams.delete('phone');
      url.searchParams.delete('password');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, []);

  const { register, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const normalizedPhone = values.phone.replace(/\s+/g, '').trim();
      const normalized = {
        phone: normalizedPhone,
        password: values.password,
      };
      const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
      const res = await fetch(`${base}/api/auth/web/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(normalized),
      });

      if (!res.ok) {
        const retryAfterHeader = res.headers.get('retry-after');
        const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
        if (res.status === 429) {
          if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
            throw new Error(
              `Too many login attempts. Try again in ${Math.ceil(retryAfterSeconds)} sec.`,
            );
          }
          throw new Error('Too many login attempts. Please wait about a minute and retry.');
        }

        let details = `status ${res.status}`;
        try {
          const errJson = (await res.json()) as {
            message?: string | string[];
            error?: string;
            data?: { message?: string | string[]; error?: string };
          };
          const msg =
            errJson.data?.message ??
            errJson.message ??
            errJson.data?.error ??
            errJson.error;
          if (Array.isArray(msg)) {
            details = msg.join(', ');
          } else if (typeof msg === 'string' && msg.length > 0) {
            details = msg;
          }
        } catch {
          // ignore json parsing error
        }
        throw new Error(details);
      }

      const json = (await res.json()) as {
        data?: {
          user?: { role?: string };
          accessToken?: string;
          data?: { user?: { role?: string }; accessToken?: string };
        };
      };
      // Support both plain and wrapped response envelopes.
      const payload = json.data?.data ?? json.data;
      const role = payload?.user?.role ?? 'passenger';
      const accessToken = payload?.accessToken;
      if (role !== 'admin' && role !== 'moderator' && role !== 'superadmin') {
        await tokenStore.clear();
        appToast.error('Admin role required', 'Please use admin account.');
        return;
      }
      if (accessToken) {
        await tokenStore.setTokens({ accessToken });
      } else {
        // Avoid leaking stale bearer from a previous session.
        await tokenStore.clear();
      }

      appToast.success('Welcome back');
      router.push('/dashboard');
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Check credentials and try again.';
      appToast.error('Login failed', message);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Admin Login</h1>
        <p className="mt-1 text-sm text-muted-foreground">Access restricted to admin and moderator roles.</p>
        {error === 'admin_only' ? (
          <p className="mt-3 rounded-md bg-rose-100/70 px-3 py-2 text-sm text-rose-800 dark:bg-rose-900/30 dark:text-rose-200">
            You do not have admin permissions.
          </p>
        ) : null}

        <form className="mt-5 space-y-4" onSubmit={onSubmit} method="post" action="/login" autoComplete="on">
          <div>
            <label className="mb-1 block text-sm">Phone</label>
            <Input placeholder="+998901234567" {...register('phone')} />
          </div>
          <div>
            <label className="mb-1 block text-sm">Password</label>
            <Input type="password" placeholder="******" {...register('password')} />
          </div>
          <Button type="submit" disabled={formState.isSubmitting} className="w-full">
            {formState.isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
