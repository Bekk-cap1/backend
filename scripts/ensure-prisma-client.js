const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const source = path.join(root, 'node_modules', '.prisma', 'client');
const targetDir = path.join(root, 'node_modules', '@prisma', 'client', '.prisma');
const target = path.join(targetDir, 'client');

const inCi = process.env.CI === 'true' || process.env.CI === '1';

if (!fs.existsSync(source)) {
  const msg = 'Prisma client not found. Run `prisma generate` first.';
  if (inCi) {
    console.warn(msg);
    process.exit(0);
  }
  console.error(msg);
  process.exit(1);
}

try {
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });
  fs.cpSync(source, target, { recursive: true });
} catch (error) {
  const msg = 'Failed to sync Prisma client to @prisma/client/.prisma';
  if (inCi) {
    console.warn(msg);
    console.warn(error);
    process.exit(0);
  }
  console.error(msg);
  console.error(error);
  process.exit(1);
}
