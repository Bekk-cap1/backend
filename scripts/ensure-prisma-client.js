const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const source = path.join(root, 'node_modules', '.prisma', 'client');
const targetDir = path.join(root, 'node_modules', '@prisma', 'client', '.prisma');
const target = path.join(targetDir, 'client');

const inCi = process.env.CI === 'true' || process.env.CI === '1';
const skipSync =
  process.env.SKIP_PRISMA_CLIENT_SYNC === 'true' ||
  process.env.SKIP_PRISMA_CLIENT_SYNC === '1';

if (skipSync) {
  process.exit(0);
}

if (!fs.existsSync(source)) {
  const msg = 'Prisma client not found. Run `prisma generate` first.';
  console.warn(msg);
  process.exit(0);
}

try {
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });
  fs.cpSync(source, target, { recursive: true });
} catch (error) {
  const msg = 'Failed to sync Prisma client to @prisma/client/.prisma';
  console.warn(msg);
  console.warn(error);
  process.exit(0);
}
