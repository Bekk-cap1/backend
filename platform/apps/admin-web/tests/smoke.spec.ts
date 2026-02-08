import { expect, test, type Route } from '@playwright/test';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

function json(route: Route, payload: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers: {
      'access-control-allow-origin': 'http://127.0.0.1:3001',
      'access-control-allow-credentials': 'true',
    },
    body: JSON.stringify(payload),
  });
}

function mockApi(route: Route) {
  const request = route.request();
  const method = request.method().toUpperCase();
  const url = new URL(request.url());
  const path = url.pathname;

  if (method === 'OPTIONS') {
    return route.fulfill({
      status: 204,
      headers: {
        'access-control-allow-origin': 'http://127.0.0.1:3001',
        'access-control-allow-credentials': 'true',
        'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
        'access-control-allow-headers': 'content-type,authorization,x-csrf-token',
      },
    });
  }

  if (path === '/api/auth/web/login' && method === 'POST') {
    return json(route, {
      data: {
        user: { id: 'admin-1', role: 'admin', phone: '+998944692509' },
        accessToken: 'admin-access-token',
      },
    });
  }

  if (path === '/api/v1/admin/users' && method === 'GET') {
    return json(route, {
      data: {
        items: [
          {
            id: 'u1',
            phone: '+998900000001',
            role: 'passenger',
            isBanned: false,
            createdAt: '2026-02-08T00:00:00.000Z',
          },
        ],
      },
    });
  }

  if (path.startsWith('/api/v1/admin/users/') && method === 'PATCH') {
    return json(route, { data: { ok: true } });
  }
  if (
    path.startsWith('/api/v1/admin/users/') &&
    (path.endsWith('/ban') || path.endsWith('/unban')) &&
    method === 'POST'
  ) {
    return json(route, { data: { ok: true } });
  }

  if (path === '/api/v1/admin/drivers' && method === 'GET') {
    return json(route, {
      data: {
        items: [
          {
            id: 'd1',
            userId: 'd1',
            phone: '+998900000002',
            status: 'pending',
            createdAt: '2026-02-08T00:00:00.000Z',
          },
        ],
      },
    });
  }

  if (path.startsWith('/api/v1/admin/drivers/') && method === 'POST') {
    return json(route, { data: { ok: true } });
  }

  if (path === '/api/admin/poi' && method === 'GET') {
    return json(route, {
      data: {
        items: [
          {
            id: 'p1',
            name: 'Camera #1',
            type: 'camera',
            lat: 41.3123,
            lon: 69.2781,
            radiusMeters: 1200,
            isActive: true,
          },
        ],
      },
    });
  }

  if (
    path === '/api/admin/poi' ||
    path === '/api/admin/poi/import' ||
    (path.startsWith('/api/admin/poi/') &&
      ['PATCH', 'DELETE', 'POST'].includes(method))
  ) {
    return json(route, { data: { ok: true } }, method === 'POST' ? 201 : 200);
  }

  if (path === '/api/admin/poi/reports' && method === 'GET') {
    return json(route, {
      data: {
        items: [
          {
            id: 'r1',
            type: 'camera',
            status: 'pending',
            lat: 41.31,
            lon: 69.27,
            createdAt: '2026-02-08T00:00:00.000Z',
          },
        ],
      },
    });
  }

  if (path.startsWith('/api/admin/poi/reports/') && method === 'POST') {
    return json(route, { data: { ok: true } });
  }

  if (path === '/api/v1/admin/tickets' && method === 'GET') {
    return json(route, {
      data: {
        items: [
          {
            id: 't1',
            subject: 'Need help',
            category: 'general',
            status: 'open',
            createdAt: '2026-02-08T00:00:00.000Z',
          },
        ],
      },
    });
  }
  if (path.startsWith('/api/v1/admin/tickets/') && method === 'PATCH') {
    return json(route, { data: { ok: true } });
  }

  if (path === '/api/v1/admin/payments' && method === 'GET') {
    return json(route, {
      data: {
        items: [
          {
            id: 'pay1',
            amount: 120000,
            currency: 'UZS',
            status: 'pending',
            createdAt: '2026-02-08T00:00:00.000Z',
          },
        ],
      },
    });
  }
  if (path.startsWith('/api/payments/') && path.endsWith('/mark-paid')) {
    return json(route, { data: { ok: true } }, 201);
  }

  if (path === '/api/admin/audit') {
    return json(route, {
      data: {
        items: [
          {
            id: 'a1',
            action: 'user.ban',
            actorId: 'admin-1',
            entityType: 'user',
            entityId: 'u1',
            createdAt: '2026-02-08T00:00:00.000Z',
          },
        ],
      },
    });
  }

  if (path === '/api/notifications/my') {
    return json(route, { data: [] });
  }

  return json(route, { data: { items: [] } });
}

test.beforeEach(async ({ context, page }) => {
  await context.addCookies([
    { name: 'admin_session', value: '1', domain: '127.0.0.1', path: '/' },
    { name: 'user_role', value: 'admin', domain: '127.0.0.1', path: '/' },
    { name: 'csrf_token', value: 'e2e-csrf', domain: '127.0.0.1', path: '/' },
  ]);
  await page.addInitScript(() => {
    window.localStorage.setItem('admin_access_token', 'admin-access-token');
  });
  await page.route(`${apiBase}/**`, (route) => mockApi(route));
});

test('smoke: login and core admin routes', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible();

  await page.goto('/users');
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View' }).first()).toBeVisible();

  await page.goto('/users/u1');
  await expect(page.getByText(/User u1/i)).toBeVisible();

  await page.goto('/drivers');
  await expect(page.getByRole('heading', { name: 'Drivers' })).toBeVisible();

  await page.goto('/drivers/d1');
  await expect(page.getByText(/Driver d1/i)).toBeVisible();

  await page.goto('/poi');
  await expect(page.getByRole('heading', { name: 'POI' })).toBeVisible();

  await page.goto('/poi-reports');
  await expect(page.getByRole('heading', { name: 'POI Reports' })).toBeVisible();

  await page.goto('/tickets');
  await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible();
  await page.getByRole('button', { name: 'In Progress' }).first().click();

  await page.goto('/tickets/t1');
  await expect(page.getByText(/Ticket t1/i)).toBeVisible();

  await page.goto('/payments');
  await expect(page.getByRole('heading', { name: 'Payments' })).toBeVisible();
});
