/**
 * Runs `pnpm run db:generate` in shared/db with retries.
 * Mitigates Windows EPERM when Prisma renames query_engine-windows.dll.node
 * (custom client output under shared/db/generated/client avoids pnpm store locks).
 * If generate still fails but the generated client is present, exits 0 unless
 * FORCE_PRISMA_GENERATE=1 (then exits 1).
 */

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.join(__dirname, "..");
const SHARED_DB = path.join(REPO_ROOT, "shared", "db");
const GENERATED_CLIENT_DIR = path.join(SHARED_DB, "generated", "client");
const MAX_ATTEMPTS = 5;
const DELAY_MS = 2000;
const SHOULD_FAIL_HARD =
  process.env.FORCE_PRISMA_GENERATE === "1" ||
  process.env.VERCEL === "1" ||
  process.env.VERCEL === "true";

function sleepMs(ms) {
  try {
    spawnSync(
      "powershell",
      ["-NoProfile", "-Command", `Start-Sleep -Milliseconds ${ms}`],
      { stdio: "ignore", shell: true },
    );
  } catch {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      /* busy wait fallback */
    }
  }
}

function isGeneratedPrismaClientPresent() {
  const indexJs = path.join(GENERATED_CLIENT_DIR, "index.js");
  return fs.existsSync(indexJs);
}

/**
 * Prisma on Windows renames query_engine-windows.dll.node.tmp* → .dll.node; EPERM
 * can leave stale tmp files. Best-effort cleanup before retries.
 */
function tryCleanupPrismaWindowsEngineArtifacts() {
  if (process.platform !== "win32") {
    return;
  }
  const dirs = [GENERATED_CLIENT_DIR];
  try {
    const pkgJson = require.resolve("@prisma/client/package.json", { paths: [REPO_ROOT] });
    dirs.push(path.join(path.dirname(pkgJson), "..", ".prisma", "client"));
  } catch {
    /* ignore */
  }
  for (const prismaClientDir of dirs) {
    if (!fs.existsSync(prismaClientDir)) {
      continue;
    }
    try {
      for (const name of fs.readdirSync(prismaClientDir)) {
        const isTmp = name.startsWith("query_engine-windows.dll.node.tmp");
        const isEngine = name === "query_engine-windows.dll.node";
        if (!isTmp && !isEngine) {
          continue;
        }
        try {
          fs.unlinkSync(path.join(prismaClientDir, name));
        } catch {
          /* locked or in use */
        }
      }
    } catch {
      /* fs errors */
    }
  }
}

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  if (attempt > 1) {
    tryCleanupPrismaWindowsEngineArtifacts();
  }

  const result = spawnSync("pnpm", ["run", "db:generate"], {
    cwd: SHARED_DB,
    stdio: "inherit",
    shell: true,
  });

  if (result.status === 0) {
    process.exit(0);
  }

  if (attempt < MAX_ATTEMPTS) {
    console.warn(
      `[prebuild] prisma generate failed (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${DELAY_MS}ms...`,
    );
    sleepMs(DELAY_MS);
  }
}

if (SHOULD_FAIL_HARD) {
  process.exit(1);
}

if (isGeneratedPrismaClientPresent()) {
  console.warn(
    "[prebuild] prisma generate failed after retries, but shared/db/generated/client is present — continuing build. " +
      "Stop other Node processes or fix AV locks if you need a fresh generate. Use FORCE_PRISMA_GENERATE=1 to fail hard.",
  );
  process.exit(0);
}

process.exit(1);
