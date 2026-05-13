#!/usr/bin/env node

/**
 * Cross-platform migration runner
 * Loads .env from project root so Prisma can see DATABASE_URL/DIRECT_URL.
 * Runs `prisma migrate deploy`; on failure falls back to `db:push` when DATABASE_URL is set.
 * Exits 0 when DATABASE_URL is missing (local/CI without DB). Fails the build when URL is set but both steps fail.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '../..');
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1).replace(/\\"/g, '"');
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1).replace(/\\'/g, "'");
        process.env[key] = val;
      }
    }
  }
}

const dbPath = path.join(__dirname, '../../shared/db');

process.chdir(dbPath);

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

try {
  console.log('🔄 Attempting to deploy migrations...');
  execSync('pnpm run db:migrate:deploy', { stdio: 'inherit' });
  console.log('✅ Migrations deployed successfully');
  process.exit(0);
} catch (_error) {
  if (!hasDatabaseUrl) {
    console.log('⚠️  Migration deploy skipped or failed (no DATABASE_URL); continuing build.');
    process.exit(0);
  }
  console.log('⚠️  Migration deploy failed, trying db:push...');
  try {
    execSync('pnpm run db:push', { stdio: 'inherit' });
    console.log('✅ Database schema pushed successfully');
    process.exit(0);
  } catch (_pushErr) {
    console.error(
      '❌ DATABASE_URL is set but migrations and db:push both failed; failing the build.',
    );
    process.exit(1);
  }
}




