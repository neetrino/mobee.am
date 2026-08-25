#!/usr/bin/env node

/**
 * Disposable PostgreSQL 16 for Phase 4 concurrency/rollback tests.
 *
 * Prisma CLI may log "Environment variables loaded from .env". That does not
 * mean Prisma overrides values already set on the process environment.
 * This script sets DATABASE_URL and DIRECT_URL to the disposable container
 * (process env wins over .env) and verifies the effective URLs before any
 * Prisma command. It never targets Neon or other cloud hosts.
 */

const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
const CONTAINER = "mobee-phase4-pg";
const PORT = "55432";
const USER = "phase4";
const PASSWORD = "phase4test";
const DATABASE = "phase4";
const DATABASE_URL = `postgresql://${USER}:${PASSWORD}@127.0.0.1:${PORT}/${DATABASE}?schema=public`;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);
const CLOUD_HOST_RE = /neon|amazonaws|supabase|render\.com|azure|pooler/i;

function run(command, args, extraEnv, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: options.shell === true,
    env: { ...process.env, ...extraEnv },
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with ${result.status}`);
  }
}

function docker(args) {
  return spawnSync("docker", args, {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
}

function waitForPostgres() {
  const started = Date.now();
  while (Date.now() - started < 60_000) {
    const ready = docker(["exec", CONTAINER, "pg_isready", "-U", USER, "-d", DATABASE]);
    if (ready.status === 0) {
      return;
    }
    spawnSync(process.platform === "win32" ? "timeout" : "sleep", process.platform === "win32" ? ["/t", "2", "/nobreak"] : ["2"], {
      stdio: "ignore",
      shell: process.platform === "win32",
    });
  }
  throw new Error("PostgreSQL 16 container did not become ready");
}

function cleanup() {
  docker(["rm", "-f", "-v", CONTAINER]);
}

function prismaArgs(args) {
  const prismaJs = path.join(ROOT, "shared", "db", "node_modules", "prisma", "build", "index.js");
  const fallback = path.join(ROOT, "node_modules", "prisma", "build", "index.js");
  const bin = fs.existsSync(prismaJs) ? prismaJs : fallback;
  return [
    bin,
    ...args,
    "--schema",
    path.join(ROOT, "shared", "db", "prisma", "schema.prisma"),
  ];
}

function assertDisposableUrl(label, value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is missing`);
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} is not a valid connection URL`);
  }
  const host = parsed.hostname.toLowerCase();
  if (!LOCAL_HOSTS.has(host) || CLOUD_HOST_RE.test(host)) {
    throw new Error(`${label} host is not the disposable Postgres container`);
  }
  const port = parsed.port || "5432";
  if (port !== PORT) {
    throw new Error(`${label} port does not match the disposable container`);
  }
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, "").split("/")[0]);
  if (database !== DATABASE) {
    throw new Error(`${label} database name does not match the disposable container`);
  }
}

function assertEffectiveDatabaseTargets(dbEnv) {
  assertDisposableUrl("DATABASE_URL", dbEnv.DATABASE_URL);
  assertDisposableUrl("DIRECT_URL", dbEnv.DIRECT_URL);
}

cleanup();
try {
  const started = docker([
    "run",
    "-d",
    "--name",
    CONTAINER,
    "-e",
    `POSTGRES_USER=${USER}`,
    "-e",
    `POSTGRES_PASSWORD=${PASSWORD}`,
    "-e",
    `POSTGRES_DB=${DATABASE}`,
    "-p",
    `${PORT}:5432`,
    "postgres:16-alpine",
  ]);
  if (started.status !== 0) {
    throw new Error(started.stderr || "Failed to start postgres:16");
  }

  waitForPostgres();

  const dbEnv = {
    DATABASE_URL,
    DIRECT_URL: DATABASE_URL,
    PHASE4_INTEGRATION: "1",
  };
  assertEffectiveDatabaseTargets(dbEnv);

  run(process.execPath, prismaArgs(["validate"]), dbEnv);
  run(process.execPath, prismaArgs(["migrate", "deploy"]), dbEnv);
  run(process.execPath, prismaArgs(["migrate", "status"]), dbEnv);
  run(
    "pnpm",
    ["exec", "vitest", "run", "--fileParallelism=false", "src/lib/commerce/phase4.integration.test.ts", "src/lib/commerce/phase4-payment-delete.integration.test.ts", "src/lib/commerce/phase4-checkout.integration.test.ts"],
    dbEnv,
    { shell: process.platform === "win32" },
  );
} finally {
  cleanup();
}
