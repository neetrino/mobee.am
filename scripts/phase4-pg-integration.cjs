#!/usr/bin/env node

/**
 * Disposable PostgreSQL 16 for Phase 4 concurrency/rollback tests.
 *
 * Prisma CLI may log "Environment variables loaded from .env". That log line
 * is not proof that Prisma overrides process-env values. This script sets
 * DATABASE_URL and DIRECT_URL on the child process (process env wins over
 * .env), simulates Prisma's dotenv fill, and verifies the effective local
 * URLs before any Prisma command. It never targets Neon or other cloud hosts.
 * Credentials are never printed.
 *
 * Container ownership: unique name per run, labels mobee.phase4.owner / run.
 * finally removes only the container this process created. It never docker rm
 * a pre-existing mobee-phase4-pg or any unlabeled container.
 */

const { spawnSync } = require("child_process");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const {
  assertEffectiveDatabaseTargets,
  resolveEffectiveDatabaseEnv,
} = require("./phase4-db-url-guard.cjs");
const {
  createPhase4RunIdentity,
  dockerLabelArgs,
  parsePublishedPort,
  shouldRemoveOwnedContainer,
} = require("./phase4-docker-owner.cjs");

const ROOT = path.resolve(__dirname, "..");
const PREFERRED_PORT = "55432";
const USER = "phase4";
const PASSWORD = "phase4test";
const DATABASE = "phase4";
const IMAGE = "postgres:16-alpine";

const identity = createPhase4RunIdentity(process.pid, crypto.randomBytes(4).toString("hex"));
let ownedContainerId = null;

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
    windowsHide: true,
  });
}

function waitForPostgres(containerName) {
  const started = Date.now();
  while (Date.now() - started < 60_000) {
    const ready = docker(["exec", containerName, "pg_isready", "-U", USER, "-d", DATABASE]);
    if (ready.status === 0) {
      return;
    }
    spawnSync(
      process.platform === "win32" ? "timeout" : "sleep",
      process.platform === "win32" ? ["/t", "2", "/nobreak"] : ["2"],
      { stdio: "ignore", shell: process.platform === "win32" },
    );
  }
  throw new Error("PostgreSQL 16 container did not become ready");
}

function inspectOwnedLabels(containerId) {
  const inspected = docker(["inspect", "--format", "{{json .Config.Labels}}", containerId]);
  if (inspected.status !== 0) {
    return null;
  }
  try {
    return { labels: JSON.parse(String(inspected.stdout || "{}").trim() || "{}") };
  } catch {
    return null;
  }
}

function cleanupOwnContainer() {
  if (!ownedContainerId) {
    return;
  }
  const inspect = inspectOwnedLabels(ownedContainerId);
  if (inspect && !shouldRemoveOwnedContainer(inspect, identity.runId)) {
    return;
  }
  docker(["rm", "-f", "-v", ownedContainerId]);
  ownedContainerId = null;
}

function runArgsForPort(hostPort) {
  const publish = hostPort === "0" ? "127.0.0.1:0:5432" : `127.0.0.1:${hostPort}:5432`;
  return [
    "run",
    "-d",
    "--name",
    identity.containerName,
    ...dockerLabelArgs(identity.labels),
    "-e",
    `POSTGRES_USER=${USER}`,
    "-e",
    `POSTGRES_PASSWORD=${PASSWORD}`,
    "-e",
    `POSTGRES_DB=${DATABASE}`,
    "-p",
    publish,
    IMAGE,
  ];
}

function startOwnedPostgres() {
  const preferred = docker(runArgsForPort(PREFERRED_PORT));
  if (preferred.status === 0) {
    return { id: String(preferred.stdout).trim(), port: PREFERRED_PORT };
  }

  const ephemeral = docker(runArgsForPort("0"));
  if (ephemeral.status !== 0) {
    throw new Error(
      "Failed to start postgres:16 on a free local port (did not remove any existing container)",
    );
  }
  const published = docker(["port", identity.containerName, "5432"]);
  const port = parsePublishedPort(String(published.stdout || ""));
  if (!port) {
    throw new Error("Failed to resolve the published local Postgres port");
  }
  return { id: String(ephemeral.stdout).trim(), port };
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

function readLocalDotenvContents() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) {
    return "";
  }
  return fs.readFileSync(envPath, "utf8");
}

function assertChildProcessDatabaseTargets(childEnv, expected) {
  const effective = resolveEffectiveDatabaseEnv(childEnv, readLocalDotenvContents());
  assertEffectiveDatabaseTargets(effective, expected);
}

try {
  const started = startOwnedPostgres();
  ownedContainerId = started.id;
  const port = started.port;
  const databaseUrl = `postgresql://${USER}:${PASSWORD}@127.0.0.1:${port}/${DATABASE}?schema=public`;
  const expectedTarget = { port, database: DATABASE };

  waitForPostgres(identity.containerName);

  const dbEnv = {
    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,
    PHASE4_INTEGRATION: "1",
  };
  const childEnv = { ...process.env, ...dbEnv };
  assertChildProcessDatabaseTargets(childEnv, expectedTarget);

  run(process.execPath, prismaArgs(["validate"]), dbEnv);
  run(process.execPath, prismaArgs(["migrate", "deploy"]), dbEnv);
  run(process.execPath, prismaArgs(["migrate", "status"]), dbEnv);
  run(
    "pnpm",
    [
      "exec",
      "vitest",
      "run",
      "--fileParallelism=false",
      "src/lib/commerce/phase4.integration.test.ts",
      "src/lib/commerce/phase4-payment-delete.integration.test.ts",
      "src/lib/commerce/phase4-checkout.integration.test.ts",
      "src/lib/commerce/phase5-checkout.integration.test.ts",
      "src/lib/commerce/phase5-payment-callback.integration.test.ts",
      "src/lib/commerce/phase6-outbox.integration.test.ts",
    ],
    dbEnv,
    { shell: process.platform === "win32" },
  );
} finally {
  cleanupOwnContainer();
}
