import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const platformRoot = resolve(__dirname, '..');
const repoRoot = resolve(platformRoot, '..');

const openapiPath = resolve(repoRoot, 'docs', 'openapi.json');
const outputMdPath = resolve(platformRoot, 'docs', 'api-coverage.md');
const outputJsonPath = resolve(platformRoot, 'docs', 'api-coverage.json');

const uiRoots = [
  resolve(platformRoot, 'apps', 'admin-web'),
  resolve(platformRoot, 'apps', 'mobile'),
];
const apiClientRoot = resolve(platformRoot, 'packages', 'api-client', 'src');

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);

const specRaw = await readFile(openapiPath, 'utf8');
const spec = JSON.parse(specRaw);
const paths = spec.paths ?? {};

const endpoints = [];
for (const [rawPath, operations] of Object.entries(paths)) {
  const path = normalizePath(rawPath);
  const ops = operations ?? {};
  for (const [methodRaw, operation] of Object.entries(ops)) {
    const method = methodRaw.toLowerCase();
    if (!HTTP_METHODS.has(method)) {
      continue;
    }
    const op = operation ?? {};
    endpoints.push({
      method,
      path,
      canonical: canonicalizePath(path),
      operationId: typeof op.operationId === 'string' ? op.operationId : '',
      tag:
        Array.isArray(op.tags) && typeof op.tags[0] === 'string'
          ? op.tags[0]
          : 'untagged',
      wrapperRefs: [],
      uiRefs: [],
    });
  }
}

endpoints.sort((a, b) =>
  a.tag.localeCompare(b.tag) ||
  a.path.localeCompare(b.path) ||
  a.method.localeCompare(b.method),
);

const endpointByExactKey = new Map();
const endpointByCanonicalKey = new Map();
for (const endpoint of endpoints) {
  const exactKey = key(endpoint.method, endpoint.path);
  endpointByExactKey.set(exactKey, endpoint);

  const canonicalKey = key(endpoint.method, endpoint.canonical);
  const bucket = endpointByCanonicalKey.get(canonicalKey) ?? [];
  bucket.push(endpoint);
  endpointByCanonicalKey.set(canonicalKey, bucket);
}

const wrapperEndpointMap = new Map();

const apiClientFiles = await listFiles(apiClientRoot);
for (const file of apiClientFiles) {
  if (!file.endsWith('.ts') || file.includes(`${separator()}__tests__${separator()}`)) {
    continue;
  }

  const content = await readFile(file, 'utf8');
  const lines = content.split(/\r?\n/);
  const factoryName = resolveFactoryName(content, file);

  const requestRegex =
    /api\.request\(\s*['"`](get|post|put|patch|delete)['"`]\s*,\s*(`[^`]*`|'[^']*'|"[^"]*")/g;
  const clientRegex =
    /api\.client\.(get|post|put|patch|delete)\(\s*(`[^`]*`|'[^']*'|"[^"]*")/g;

  for (const match of iterateMatches(content, requestRegex)) {
    processApiClientMatch({
      file,
      lines,
      factoryName,
      method: match[1]?.toLowerCase(),
      rawPathLiteral: match[2],
      matchIndex: match.index ?? 0,
    });
  }

  for (const match of iterateMatches(content, clientRegex)) {
    processApiClientMatch({
      file,
      lines,
      factoryName,
      method: match[1]?.toLowerCase(),
      rawPathLiteral: match[2],
      matchIndex: match.index ?? 0,
    });
  }
}

const uiFiles = [];
for (const root of uiRoots) {
  const files = await listFiles(root);
  for (const file of files) {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) {
      continue;
    }
    uiFiles.push(file);
  }
}

for (const file of uiFiles) {
  const content = await readFile(file, 'utf8');

  const wrapperCallRegex =
    /\b([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*([A-Za-z0-9_$.]+)\s*\)\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
  for (const match of iterateMatches(content, wrapperCallRegex)) {
    const factory = match[1];
    const methodName = match[3];
    if (!factory || !methodName) {
      continue;
    }
    const wrapperKey = `${factory}.${methodName}`;
    const endpoint = wrapperEndpointMap.get(wrapperKey);
    if (!endpoint) {
      continue;
    }

    addRef(endpoint.uiRefs, makeRef(file, lineNumberAt(content, match.index ?? 0)));
  }

  const directClientRegex =
    /apiClient\.client\.(get|post|put|patch|delete)\(\s*(`[^`]*`|'[^']*'|"[^"]*")/g;
  for (const match of iterateMatches(content, directClientRegex)) {
    const method = match[1]?.toLowerCase();
    const path = normalizeLiteralToPath(match[2]);
    if (!method || !path) {
      continue;
    }

    const endpoint = findEndpoint(method, path);
    if (!endpoint) {
      continue;
    }

    addRef(endpoint.uiRefs, makeRef(file, lineNumberAt(content, match.index ?? 0)));
  }

  const directRequestRegex =
    /apiClient\.request\(\s*['"`](get|post|put|patch|delete)['"`]\s*,\s*(`[^`]*`|'[^']*'|"[^"]*")/g;
  for (const match of iterateMatches(content, directRequestRegex)) {
    const method = match[1]?.toLowerCase();
    const path = normalizeLiteralToPath(match[2]);
    if (!method || !path) {
      continue;
    }

    const endpoint = findEndpoint(method, path);
    if (!endpoint) {
      continue;
    }

    addRef(endpoint.uiRefs, makeRef(file, lineNumberAt(content, match.index ?? 0)));
  }

  const fetchRegex =
    /fetch\(\s*(`[^`]*\/api\/[^`]*`|'[^']*\/api\/[^']*'|"[^"]*\/api\/[^"]*")/g;
  for (const match of iterateMatches(content, fetchRegex)) {
    const path = normalizeLiteralToPath(match[1]);
    if (!path) {
      continue;
    }
    const endpoint = findEndpoint('post', path) ?? findEndpoint('get', path);
    if (!endpoint) {
      continue;
    }

    addRef(endpoint.uiRefs, makeRef(file, lineNumberAt(content, match.index ?? 0)));
  }
}

let usedInUi = 0;
let wrappedOnly = 0;
let backendOnly = 0;
let unused = 0;

for (const endpoint of endpoints) {
  const isBackendOnly = isBackendOnlyEndpoint(endpoint.path);
  if (isBackendOnly) {
    endpoint.status = 'BACKEND_ONLY';
    backendOnly += 1;
    continue;
  }

  if (endpoint.uiRefs.length > 0) {
    endpoint.status = 'USED_IN_UI';
    usedInUi += 1;
    continue;
  }

  if (endpoint.wrapperRefs.length > 0) {
    endpoint.status = 'WRAPPED_ONLY';
    wrappedOnly += 1;
    continue;
  }

  endpoint.status = 'UNUSED';
  unused += 1;
}

const total = endpoints.length;
const functionalTotal = total - backendOnly;
const wrapperCovered = usedInUi + wrappedOnly;

const jsonReport = {
  generatedAt: new Date().toISOString(),
  source: relativePath(openapiPath),
  totals: {
    total,
    usedInUi,
    wrappedOnly,
    backendOnly,
    unused,
    overallUiCoveragePct: pct(usedInUi, total),
    functionalUiCoveragePct: pct(usedInUi, functionalTotal),
    functionalWrapperCoveragePct: pct(wrapperCovered, functionalTotal),
  },
  endpoints: endpoints.map((endpoint) => ({
    tag: endpoint.tag,
    method: endpoint.method.toUpperCase(),
    path: endpoint.path,
    operationId: endpoint.operationId || null,
    status: endpoint.status,
    wrapperRefs: endpoint.wrapperRefs,
    uiRefs: endpoint.uiRefs,
  })),
};

const markdown = [];
markdown.push('# API Usage Coverage');
markdown.push('');
markdown.push(`Source: \`${relativePath(openapiPath)}\``);
markdown.push(`Generated: \`${jsonReport.generatedAt}\``);
markdown.push('');
markdown.push('## Summary');
markdown.push('');
markdown.push('| Metric | Value |');
markdown.push('| --- | ---: |');
markdown.push(`| Total endpoints | ${total} |`);
markdown.push(`| USED_IN_UI | ${usedInUi} |`);
markdown.push(`| WRAPPED_ONLY | ${wrappedOnly} |`);
markdown.push(`| BACKEND_ONLY | ${backendOnly} |`);
markdown.push(`| UNUSED | ${unused} |`);
markdown.push(`| Overall UI coverage | ${pct(usedInUi, total)}% |`);
markdown.push(`| Functional UI coverage (excluding BACKEND_ONLY) | ${pct(usedInUi, functionalTotal)}% |`);
markdown.push(
  `| Functional wrapper coverage (USED_IN_UI + WRAPPED_ONLY, excluding BACKEND_ONLY) | ${pct(wrapperCovered, functionalTotal)}% |`,
);
markdown.push('');

const byTag = new Map();
for (const endpoint of endpoints) {
  const bucket = byTag.get(endpoint.tag) ?? [];
  bucket.push(endpoint);
  byTag.set(endpoint.tag, bucket);
}

for (const tag of [...byTag.keys()].sort((a, b) => a.localeCompare(b))) {
  const group = byTag.get(tag) ?? [];
  markdown.push(`## ${tag}`);
  markdown.push('');
  markdown.push(`Endpoints: ${group.length}`);
  markdown.push('');
  markdown.push('| Method | Path | Status | OperationId | Wrapper | UI Calls |');
  markdown.push('| --- | --- | --- | --- | --- | --- |');

  for (const endpoint of group) {
    const wrappers = endpoint.wrapperRefs.length
      ? endpoint.wrapperRefs.map((ref) => `\`${ref.file}:${ref.line}\``).join('<br>')
      : '-';
    const uiCalls = endpoint.uiRefs.length
      ? endpoint.uiRefs.map((ref) => `\`${ref.file}:${ref.line}\``).join('<br>')
      : '-';
    markdown.push(
      `| ${endpoint.method.toUpperCase()} | \`${endpoint.path}\` | ${endpoint.status} | ${
        endpoint.operationId || '-'
      } | ${wrappers} | ${uiCalls} |`,
    );
  }

  markdown.push('');
}

await mkdir(dirname(outputMdPath), { recursive: true });
await writeFile(outputMdPath, `${markdown.join('\n')}\n`, 'utf8');
await writeFile(outputJsonPath, `${JSON.stringify(jsonReport, null, 2)}\n`, 'utf8');

console.log(`[coverage] generated ${relativePath(outputMdPath)}`);
console.log(`[coverage] generated ${relativePath(outputJsonPath)}`);

function processApiClientMatch({
  file,
  lines,
  factoryName,
  method,
  rawPathLiteral,
  matchIndex,
}) {
  if (!method || !rawPathLiteral) {
    return;
  }

  const path = normalizeLiteralToPath(rawPathLiteral);
  if (!path) {
    return;
  }

  const endpoint = findEndpoint(method, path);
  if (!endpoint) {
    return;
  }

  const line = lineNumberAt(lines.join('\n'), matchIndex);
  const methodName = resolveObjectMethodName(lines, line - 1);
  const wrapperKey = `${factoryName}.${methodName ?? 'unknown'}`;
  wrapperEndpointMap.set(wrapperKey, endpoint);

  addRef(endpoint.wrapperRefs, makeRef(file, line));
}

function findEndpoint(method, path) {
  const exact = endpointByExactKey.get(key(method, path));
  if (exact) {
    return exact;
  }

  const canonical = endpointByCanonicalKey.get(key(method, canonicalizePath(path)));
  if (!canonical || canonical.length === 0) {
    return null;
  }

  if (canonical.length === 1) {
    return canonical[0];
  }

  return canonical.find((candidate) => candidate.path === path) ?? canonical[0];
}

function resolveFactoryName(content, file) {
  const match = content.match(/export const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\(api:/);
  if (match?.[1]) {
    return match[1];
  }
  const base = file.split(/[\\/]/).at(-1)?.replace(/\.ts$/, '') ?? 'api';
  return `${base}Api`;
}

function resolveObjectMethodName(lines, lineIndex) {
  const start = Math.max(0, lineIndex - 8);
  for (let i = lineIndex; i >= start; i -= 1) {
    const line = lines[i] ?? '';
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\(/);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

function normalizeLiteralToPath(rawLiteral) {
  if (!rawLiteral) {
    return null;
  }

  let value = rawLiteral.trim();
  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith('`') && value.endsWith('`'))
  ) {
    value = value.slice(1, -1);
  }

  value = value.replace(/\$\{([^}]+)\}/g, (_full, expr) => {
    const cleaned = String(expr)
      .trim()
      .replace(/[^A-Za-z0-9_]/g, '');
    return `{${cleaned || 'param'}}`;
  });

  const apiIndex = value.indexOf('/api/');
  const healthMatch = value.match(/\/(health(?:\/[A-Za-z0-9_-]+)?|metrics(?:\/[A-Za-z0-9_-]+)?)/);
  if (apiIndex >= 0) {
    value = value.slice(apiIndex);
  } else if (healthMatch?.index !== undefined) {
    value = value.slice(healthMatch.index);
  } else if (value.startsWith('/api/') || value.startsWith('/health') || value.startsWith('/metrics')) {
    // keep as-is
  } else {
    return null;
  }

  value = value.split('?')[0].split('#')[0];
  return normalizePath(value);
}

function normalizePath(path) {
  if (!path) {
    return '/';
  }
  let normalized = path.replace(/\\/g, '/').replace(/\/{2,}/g, '/').trim();
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function canonicalizePath(path) {
  return normalizePath(path).replace(/\{[^/}]+\}/g, '{}');
}

function key(method, path) {
  return `${method.toLowerCase()} ${path}`;
}

function addRef(target, ref) {
  if (!target.some((item) => item.file === ref.file && item.line === ref.line)) {
    target.push(ref);
  }
}

function makeRef(file, line) {
  return {
    file: relativePath(file),
    line,
  };
}

function relativePath(file) {
  return relative(repoRoot, file).replace(/\\/g, '/');
}

function lineNumberAt(content, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content.charCodeAt(i) === 10) {
      line += 1;
    }
  }
  return line;
}

function pct(value, totalValue) {
  if (!totalValue || totalValue <= 0) {
    return 0;
  }
  return Number(((value / totalValue) * 100).toFixed(2));
}

function isBackendOnlyEndpoint(path) {
  return /(\/health(?:\/|$)|\/ready(?:\/|$)|\/metrics(?:\/|$)|\/webhooks?(?:\/|$))/i.test(path);
}

async function listFiles(root) {
  const result = [];
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') {
      continue;
    }
    const absolutePath = resolve(root, entry.name);
    if (entry.isDirectory()) {
      const nested = await listFiles(absolutePath);
      result.push(...nested);
    } else {
      result.push(absolutePath);
    }
  }
  return result;
}

function* iterateMatches(content, regex) {
  let match;
  while ((match = regex.exec(content)) !== null) {
    yield match;
  }
}

function separator() {
  return process.platform === 'win32' ? '\\' : '/';
}
