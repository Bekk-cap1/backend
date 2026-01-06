const path = require('node:path');

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
]);

const bannedPathMatchers = [
  /^dist\//,
  /^build\//,
  /^coverage\//,
  /^node_modules\//,
  /^\.env$/,
  /^\.env\./,
];

const files = process.argv.slice(2);
if (files.length === 0) {
  process.exit(0);
}

const violations = [];

for (const file of files) {
  const normalized = file.split(path.sep).join('/');
  const ext = path.extname(normalized).toLowerCase();
  const base = path.basename(normalized);

  if (base === '.env.example') {
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
