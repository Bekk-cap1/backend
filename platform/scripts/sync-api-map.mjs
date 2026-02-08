import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const platformRoot = resolve(__dirname, '..');
const source = resolve(platformRoot, '.cache', 'openapi.json');
const contractOutput = resolve(platformRoot, 'docs', 'API_CONTRACT.md');
const mapOutput = resolve(platformRoot, 'docs', 'api-map.md');
const legacyMapOutput = resolve(platformRoot, 'docs', 'product', 'api-map.md');

const raw = await readFile(source, 'utf8');
const spec = JSON.parse(raw);
const paths = spec.paths ?? {};

const lines = [];
lines.push('# API Contract');
lines.push('');
lines.push('Generated from `../docs/openapi.json`.');
lines.push('');
lines.push('| Method | Path | Tags | OperationId |');
lines.push('| --- | --- | --- | --- |');

for (const [path, operations] of Object.entries(paths)) {
  const ops = operations ?? {};
  for (const method of Object.keys(ops).sort()) {
    const op = ops[method] ?? {};
    const tags = Array.isArray(op.tags) ? op.tags.join(', ') : '-';
    const operationId = typeof op.operationId === 'string' ? op.operationId : '-';
    lines.push(`| ${method.toUpperCase()} | \`${path}\` | ${tags || '-'} | ${operationId} |`);
  }
}

const ops = [];
for (const [path, operations] of Object.entries(paths)) {
  const normalizedPath = normalizePath(path);
  const group = resolveGroup(normalizedPath);
  for (const method of Object.keys(operations ?? {}).sort()) {
    const operation = operations?.[method] ?? {};
    ops.push({
      group,
      page: resolvePage(normalizedPath),
      method: method.toUpperCase(),
      path: normalizedPath,
      operationId: typeof operation.operationId === 'string' ? operation.operationId : '-',
    });
  }
}

const mapLines = [];
mapLines.push('# API Map');
mapLines.push('');
mapLines.push('Generated from `platform/.cache/openapi.json`.');
mapLines.push('');
mapLines.push('| Area | Page | Method | Path | OperationId |');
mapLines.push('| --- | --- | --- | --- | --- |');
for (const op of ops.sort((a, b) =>
  a.group.localeCompare(b.group) ||
  a.path.localeCompare(b.path) ||
  a.method.localeCompare(b.method),
)) {
  mapLines.push(`| ${op.group} | ${op.page} | ${op.method} | \`${op.path}\` | ${op.operationId} |`);
}

await mkdir(dirname(contractOutput), { recursive: true });
await writeFile(contractOutput, `${lines.join('\n')}\n`, 'utf8');
await mkdir(dirname(mapOutput), { recursive: true });
await writeFile(mapOutput, `${mapLines.join('\n')}\n`, 'utf8');
await mkdir(dirname(legacyMapOutput), { recursive: true });
await writeFile(legacyMapOutput, `${mapLines.join('\n')}\n`, 'utf8');

console.log(`[openapi] generated ${contractOutput}`);
console.log(`[openapi] generated ${mapOutput}`);
console.log(`[openapi] generated ${legacyMapOutput}`);

function normalizePath(value) {
  if (!value.startsWith('/')) return `/${value}`;
  return value;
}

function resolveGroup(path) {
  if (path.startsWith('/api/v1/admin') || path.startsWith('/api/admin')) return 'Admin';
  if (path.startsWith('/api/auth')) return 'Auth';
  if (path.startsWith('/api/trips') || path.startsWith('/api/requests') || path.startsWith('/api/offers')) return 'Trips';
  if (path.startsWith('/api/bookings') || path.startsWith('/api/driver/bookings')) return 'Bookings';
  if (path.startsWith('/api/geo')) return 'Geo';
  if (path.startsWith('/api/routing')) return 'Routing';
  if (path.startsWith('/api/poi')) return 'POI';
  if (path.startsWith('/api/payments')) return 'Payments';
  if (path.startsWith('/api/cancellations')) return 'Cancellations';
  if (path.startsWith('/api/support/tickets')) return 'Support Tickets';
  if (path.startsWith('/api/notifications')) return 'Notifications';
  if (path.startsWith('/health') || path.startsWith('/metrics') || path.startsWith('/api/health') || path.startsWith('/api/ready')) return 'Observability';
  return 'Other';
}

function resolvePage(path) {
  if (/^\/api\/v1\/admin\/users/.test(path)) return '/users';
  if (/^\/api\/v1\/admin\/drivers/.test(path)) return '/drivers';
  if (/^\/api\/v1\/admin\/payments/.test(path) || /^\/api\/payments\//.test(path)) return '/payments';
  if (/^\/api\/v1\/admin\/tickets/.test(path) || /^\/api\/support\/tickets/.test(path)) return '/tickets';
  if (/^\/api\/admin\/audit/.test(path)) return '/audit';
  if (/^\/api\/admin\/poi/.test(path) || /^\/api\/poi\//.test(path)) return '/poi and /poi-reports';
  if (/^\/api\/trips/.test(path) || /^\/api\/requests/.test(path) || /^\/api\/offers/.test(path)) return '/trips';
  if (/^\/api\/bookings/.test(path) || /^\/api\/driver\/bookings/.test(path)) return '/bookings';
  if (/^\/api\/geo/.test(path) || /^\/api\/routing/.test(path)) return '/live';
  if (/^\/api\/cancellations\//.test(path)) return '/cancellations';
  if (/^\/api\/notifications/.test(path)) return '/notifications';
  if (/^\/api\/auth/.test(path)) return '/login';
  if (/^\/health\/|^\/metrics|^\/api\/health|^\/api\/ready/.test(path)) return '/dashboard';
  return 'n/a';
}
