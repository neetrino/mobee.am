#!/usr/bin/env node

/**
 * Root-level Prisma entry: runs CLI from shared/db with the same env as other DB scripts.
 * Maps `pnpm prisma dev` → `prisma migrate dev` (Prisma has no `dev` subcommand).
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const dbRoot = path.join(rootDir, 'shared', 'db');

function loadEnvFromRoot () {
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
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
  }
}

loadEnvFromRoot();

let args = process.argv.slice(2);
if (args[0] === 'dev') {
  args = ['migrate', 'dev', ...args.slice(1)];
}

const child = spawnSync('pnpm', ['exec', 'prisma', ...args], {
  cwd: dbRoot,
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

if (child.error) {
  console.error(child.error);
  process.exit(1);
}
process.exit(child.status === null ? 1 : child.status);
