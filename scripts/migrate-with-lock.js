#!/usr/bin/env node
/* eslint-disable no-console */
const { execSync } = require('node:child_process');
const { Client } = require('pg');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required for migration lock runner');
  process.exit(1);
}

const lockKey = Number(process.env.MIGRATION_LOCK_KEY ?? 87234123);
const waitSec = Number(process.env.MIGRATION_LOCK_TIMEOUT_SEC ?? 60);

async function run() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    console.log(`Acquiring migration advisory lock ${lockKey} (timeout ${waitSec}s)`);
    await client.query('SET lock_timeout = $1', [`${waitSec}s`]);
    await client.query('SELECT pg_advisory_lock($1)', [lockKey]);

    console.log('Running prisma migrate deploy');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('Migration completed');
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [lockKey]);
    } catch (error) {
      console.error('Failed to release migration lock', error);
    }
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
