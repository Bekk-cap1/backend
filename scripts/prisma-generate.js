const { execSync } = require('node:child_process');

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://postgres:postgres@localhost:5432/postgres?schema=public';
}

if (!process.env.SHADOW_DATABASE_URL) {
  process.env.SHADOW_DATABASE_URL = process.env.DATABASE_URL;
}

execSync('prisma generate', { stdio: 'inherit' });
