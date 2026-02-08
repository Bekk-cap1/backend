import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const specPath = resolve(root, '.cache', 'openapi.json');

const required = [
  { id: 'users.list', method: 'get', path: '/api/v1/admin/users', page: 'users' },
  { id: 'users.ban', method: 'post', path: '/api/v1/admin/users/{userId}/ban', page: 'users' },
  { id: 'users.unban', method: 'post', path: '/api/v1/admin/users/{userId}/unban', page: 'users' },
  { id: 'users.changeRole', method: 'patch', path: '/api/v1/admin/users/{userId}/role', page: 'users' },
  { id: 'drivers.list', method: 'get', path: '/api/v1/admin/drivers', page: 'drivers' },
  { id: 'drivers.verify', method: 'post', path: '/api/v1/admin/drivers/{userId}/verify', page: 'drivers' },
  { id: 'drivers.reject', method: 'post', path: '/api/v1/admin/drivers/{userId}/reject', page: 'drivers' },
  { id: 'poi.list', method: 'get', path: '/api/admin/poi', page: 'poi' },
  { id: 'poi.create', method: 'post', path: '/api/admin/poi', page: 'poi' },
  { id: 'poi.update', method: 'patch', path: '/api/admin/poi/{id}', page: 'poi' },
  { id: 'poi.delete', method: 'delete', path: '/api/admin/poi/{id}', page: 'poi' },
  { id: 'poi.import', method: 'post', path: '/api/admin/poi/import', page: 'poi' },
  { id: 'poi.reports', method: 'get', path: '/api/admin/poi/reports', page: 'poi-reports' },
  { id: 'poi.report.approve', method: 'post', path: '/api/admin/poi/reports/{id}/approve', page: 'poi-reports' },
  { id: 'poi.report.reject', method: 'post', path: '/api/admin/poi/reports/{id}/reject', page: 'poi-reports' },
  { id: 'tickets.list', method: 'get', path: '/api/v1/admin/tickets', page: 'tickets' },
  { id: 'tickets.status', method: 'patch', path: '/api/v1/admin/tickets/{ticketId}/status', page: 'tickets' },
  { id: 'payments.list', method: 'get', path: '/api/v1/admin/payments', page: 'payments' },
  { id: 'payments.markPaid', method: 'post', path: '/api/payments/{paymentId}/mark-paid', page: 'payments' },
  { id: 'audit.list', method: 'get', path: '/api/admin/audit', page: 'audit' },
  { id: 'trips.list', method: 'get', path: '/api/trips', page: 'trips' },
  { id: 'bookings.list', method: 'get', path: '/api/bookings/driver', page: 'bookings' },
  { id: 'notifications.list', method: 'get', path: '/api/notifications/my', page: 'notifications' },
  { id: 'cancellations.quote', method: 'get', path: '/api/cancellations/bookings/{bookingId}/quote', page: 'cancellations' },
  { id: 'cancellations.apply', method: 'post', path: '/api/cancellations/bookings/{bookingId}/apply', page: 'cancellations' },
  { id: 'mobile.trips.search', method: 'get', path: '/api/trips/search', page: 'mobile-passenger' },
  { id: 'mobile.requests.create', method: 'post', path: '/api/trips/{tripId}/requests', page: 'mobile-passenger' },
  { id: 'mobile.offers.negotiation', method: 'get', path: '/api/requests/{requestId}/negotiation', page: 'mobile-passenger' },
  { id: 'mobile.bookings.list', method: 'get', path: '/api/bookings/my', page: 'mobile-passenger' },
  { id: 'mobile.driver.bookings', method: 'get', path: '/api/driver/bookings', page: 'mobile-driver' },
  { id: 'mobile.driver.location.update', method: 'patch', path: '/api/geo/trips/{tripId}/location', page: 'mobile-driver' },
  { id: 'mobile.passenger.eta', method: 'get', path: '/api/routing/trip/{tripId}/eta', page: 'mobile-passenger' },
  { id: 'mobile.poi.nearby', method: 'get', path: '/api/poi/nearby', page: 'mobile-common' },
  { id: 'mobile.poi.route', method: 'post', path: '/api/poi/route', page: 'mobile-common' }
];

const raw = await readFile(specPath, 'utf8');
const spec = JSON.parse(raw);
const paths = spec.paths ?? {};

const missing = required.filter((item) => !paths[item.path] || !paths[item.path][item.method]);

const mdLines = [
  '# API Gaps',
  '',
  'Generated from `platform/.cache/openapi.json` and required frontend capability matrix.',
  ''
];

if (missing.length === 0) {
  mdLines.push('No API gaps detected.');
} else {
  mdLines.push('| Action | Method | Path | Page |');
  mdLines.push('| --- | --- | --- | --- |');
  for (const gap of missing) {
    mdLines.push(`| ${gap.id} | ${gap.method.toUpperCase()} | \`${gap.path}\` | ${gap.page} |`);
  }
}

const mdOutput = resolve(root, 'docs', 'api-gaps.md');
await mkdir(dirname(mdOutput), { recursive: true });
await writeFile(mdOutput, `${mdLines.join('\n')}\n`, 'utf8');

const generatedTs = resolve(root, 'packages', 'shared', 'src', 'constants', 'api-gaps.generated.ts');
const missingIds = missing.map((item) => item.id);
const ts = `/* AUTO-GENERATED FILE. DO NOT EDIT. */
export const API_GAP_IDS = ${JSON.stringify(missingIds, null, 2)} as const;
export type ApiGapId = (typeof API_GAP_IDS)[number];
export const API_GAP_SET = new Set<string>(API_GAP_IDS);
`;
await writeFile(generatedTs, ts, 'utf8');

console.log(`[openapi] generated ${mdOutput}`);
console.log(`[openapi] generated ${generatedTs}`);
