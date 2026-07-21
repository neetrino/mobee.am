#!/usr/bin/env node

/**
 * Runs Prisma CLI with DATABASE_URL / DIRECT_URL from project root `.env`.
 * Usage: node scripts/with-root-env.cjs <prisma-args...>
 * Example: node scripts/with-root-env.cjs migrate deploy
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { withIpv4FirstDnsEnv } = require('../../../scripts/force-ipv4-dns.cjs');

const dbRoot = path.join(__dirname, '..');
const rootEnvPath = path.join(dbRoot, '..', '..', '.env');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1).replace(/\\"/g, '"');
    }
    if (val.startsWith("'") && val.endsWith("'")) {
      val = val.slice(1, -1).replace(/\\'/g, "'");
    }
    process.env[key] = val;
  }
}

loadEnvFile(rootEnvPath);
loadEnvFile(path.join(process.cwd(), '.env'));

const prismaArgs = process.argv.slice(2);
if (prismaArgs.length === 0) {
  console.error('Usage: node scripts/with-root-env.cjs <prisma-command> [args...]');
  process.exit(1);
}

const prismaBin = path.join(
  dbRoot,
  'node_modules',
  'prisma',
  'build',
  'index.js',
);

const child = spawnSync(process.execPath, [prismaBin, ...prismaArgs], {
  cwd: dbRoot,
  stdio: 'inherit',
  env: withIpv4FirstDnsEnv(process.env),
});

if (child.error) {
  console.error(child.error);
  process.exit(1);
}

process.exit(child.status === null ? 1 : child.status);
