#!/usr/bin/env node
/**
 * Validates env vars that affect storefront performance.
 * Usage: node scripts/check-perf-env.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env");

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return {};
  }
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function parseDbHost(url) {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const env = loadEnvFile(envPath);
const issues = [];
const ok = [];

const dbUrl = env.DATABASE_URL ?? process.env.DATABASE_URL ?? "";
const dbHost = parseDbHost(dbUrl);
if (!dbUrl) {
  issues.push("DATABASE_URL is missing");
} else if (dbHost?.includes("neon.tech") && !dbHost.includes("pooler")) {
  issues.push(
    `DATABASE_URL host "${dbHost}" is direct Neon — switch to the *-pooler* host for app traffic.`,
  );
} else if (dbHost?.includes("pooler")) {
  ok.push(`DATABASE_URL uses Neon pooler (${dbHost})`);
} else if (dbHost) {
  ok.push(`DATABASE_URL host: ${dbHost}`);
}

const upstashUrl = env.UPSTASH_REDIS_REST_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "";
const upstashToken = env.UPSTASH_REDIS_REST_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
if (upstashUrl && upstashToken) {
  ok.push("Upstash Redis REST credentials are set (shared listing cache enabled)");
} else {
  issues.push(
    "UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are missing — cold origin will hit Postgres.",
  );
}

console.log("\n=== Storefront performance env check ===\n");
for (const line of ok) console.log(`OK   ${line}`);
for (const line of issues) console.log(`WARN ${line}`);
process.exit(issues.length > 0 ? 1 : 0);
