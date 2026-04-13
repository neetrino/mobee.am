#!/usr/bin/env node

/**
 * Cross-platform migration runner
 * Loads .env from project root so Prisma can see DATABASE_URL/DIRECT_URL.
 * Tries to run migrations, falls back to db:push if migrations fail.
 * Always exits with success to allow build to continue.
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

try {
  console.log('🔄 Attempting to deploy migrations...');
  execSync('pnpm run db:migrate:deploy', { stdio: 'inherit' });
  console.log('✅ Migrations deployed successfully');
} catch (_error) {
  console.log('⚠️  Migration deploy failed, trying db:push...');
  try {
    execSync('pnpm run db:push', { stdio: 'inherit' });
    console.log('✅ Database schema pushed successfully');
  } catch (_pushErr) {
    console.log('⚠️  Database operations failed, but continuing build...');
    console.log('   (This is expected if DATABASE_URL is not set)');
  }
}

// Always exit with success to allow build to continue
process.exit(0);




