#!/usr/bin/env node

/**
 * Migration health checker for CI and local verification.
 * - Loads .env from project root (if present).
 * - Runs `prisma migrate status` in shared/db.
 * - Fails fast when DATABASE_URL is missing or status check fails.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '../..');
const dbDir = path.join(rootDir, 'shared/db');
const envPath = path.join(rootDir, '.env');

function loadEnvFromRoot() {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/\\"/g, '"');
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1).replace(/\\'/g, "'");
    }

    process.env[key] = value;
  }
}

function assertDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is required for migration health check.');
    process.exit(1);
  }
}

function runMigrationStatus() {
  const child = spawnSync('pnpm', ['exec', 'prisma', 'migrate', 'status'], {
    cwd: dbDir,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });

  if (child.error) {
    console.error('❌ Failed to run migration status command.');
    console.error(child.error);
    process.exit(1);
  }

  process.exit(child.status === null ? 1 : child.status);
}

loadEnvFromRoot();
assertDatabaseUrl();
runMigrationStatus();
