/**
 * Guards Phase 4 disposable Postgres URLs.
 *
 * Prisma CLI may log "Environment variables loaded from .env". Existing
 * process-env keys still win; this module simulates that merge and checks
 * the effective DATABASE_URL / DIRECT_URL before any Prisma command.
 */

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);
const CLOUD_HOST_RE = /neon|amazonaws|supabase|render\.com|azure|pooler/i;

function parseDotenvContents(contents) {
  const entries = {};
  if (typeof contents !== "string" || contents.trim() === "") {
    return entries;
  }

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) {
      continue;
    }
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    entries[match[1]] = value;
  }
  return entries;
}

/**
 * Prisma dotenv fill: keys already present on the process env are kept.
 */
function applyPrismaDotenvPrecedence(processEnv, dotenvEntries) {
  const merged = { ...processEnv };
  for (const [key, value] of Object.entries(dotenvEntries)) {
    if (merged[key] === undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

function assertDisposableUrl(label, value, expected) {
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
  if (port !== expected.port) {
    throw new Error(`${label} port does not match the disposable container`);
  }
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, "").split("/")[0]);
  if (database !== expected.database) {
    throw new Error(`${label} database name does not match the disposable container`);
  }
}

function assertEffectiveDatabaseTargets(env, expected) {
  assertDisposableUrl("DATABASE_URL", env.DATABASE_URL, expected);
  assertDisposableUrl("DIRECT_URL", env.DIRECT_URL, expected);
}

function resolveEffectiveDatabaseEnv(childEnv, dotenvContents) {
  return applyPrismaDotenvPrecedence(childEnv, parseDotenvContents(dotenvContents));
}

module.exports = {
  LOCAL_HOSTS,
  CLOUD_HOST_RE,
  parseDotenvContents,
  applyPrismaDotenvPrecedence,
  assertDisposableUrl,
  assertEffectiveDatabaseTargets,
  resolveEffectiveDatabaseEnv,
};
