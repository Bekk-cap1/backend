const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const source = path.join(root, 'node_modules', '.prisma', 'client');
const targetDir = path.join(root, 'node_modules', '@prisma', 'client', '.prisma');
const target = path.join(targetDir, 'client');

if (!fs.existsSync(source)) {
  console.error('Prisma client not found. Run `prisma generate` first.');
  process.exit(1);
}

try {
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });
  fs.cpSync(source, target, { recursive: true });
} catch (error) {
  console.error('Failed to sync Prisma client to @prisma/client/.prisma');
  console.error(error);
  process.exit(1);
}
