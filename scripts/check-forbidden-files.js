const path = require('node:path');
const fs = require('node:fs');
const { execSync } = require('node:child_process');

const bannedExtensions = new Set([
  '.zip',
  '.tar',
  '.gz',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.pdf',
  '.mp4',
  '.mov',
  '.sqlite',
  '.db',
  '.pem',
  '.key',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.rar',
]);

const bannedPathMatchers = [
  /^dist\//,
  /^build\//,
  /^coverage\//,
  /^node_modules\//,
  /^uploads\//,
  /^\.cache\//,
  /^\.env$/,
  /^\.env\./,
];

const maxBytesEnv = Number(process.env.FORBIDDEN_FILE_MAX_BYTES);
const maxBytes = Number.isFinite(maxBytesEnv) && maxBytesEnv > 0 ? maxBytesEnv : 5 * 1024 * 1024;

const args = process.argv.slice(2);
const allIndex = args.indexOf('--all');
const useAll = allIndex !== -1;
const files = useAll ? loadTrackedFiles() : args.filter((arg) => arg !== '--all');

if (files.length === 0) {
  process.exit(0);
}

const violations = [];

for (const file of files) {
  const absolutePath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  const relativePath = path.relative(process.cwd(), absolutePath);
  const normalized = relativePath.split(path.sep).join('/');
  const ext = path.extname(normalized).toLowerCase();
  const base = path.basename(normalized);

  if (base === '.env.example') {
    continue;
  }

  const sizeViolation = checkFileSize(absolutePath, maxBytes);
  if (sizeViolation) {
    violations.push(`${normalized} (${sizeViolation})`);
    continue;
  }

  if (bannedExtensions.has(ext)) {
    violations.push(`${normalized} (extension ${ext})`);
    continue;
  }

  if (base === '.env' || base.startsWith('.env.')) {
    violations.push(`${normalized} (env file)`);
    continue;
  }

  if (bannedPathMatchers.some((re) => re.test(normalized))) {
    violations.push(`${normalized} (forbidden path)`);
  }
}

if (violations.length > 0) {
  console.error('Forbidden files detected in git index:');
  for (const v of violations) {
    console.error(`- ${v}`);
  }
  console.error('Remove these files before committing.');
  process.exit(1);
}

function loadTrackedFiles() {
  try {
    const output = execSync('git ls-files', { encoding: 'utf8' });
    return output.split(/\r?\n/).filter(Boolean);
  } catch (error) {
    console.error('Failed to read tracked files with git ls-files.');
    console.error(error?.message ?? error);
    process.exit(1);
  }
}

function checkFileSize(filePath, limitBytes) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return null;
    }
    if (stat.size > limitBytes) {
      const mb = (stat.size / (1024 * 1024)).toFixed(2);
      const limitMb = (limitBytes / (1024 * 1024)).toFixed(2);
      return `size ${mb}MB > ${limitMb}MB`;
    }
  } catch {
    return null;
  }
  return null;
}
