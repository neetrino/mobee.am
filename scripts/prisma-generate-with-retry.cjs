/**
 * Runs `pnpm run db:generate` in shared/db with retries.
 * Mitigates Windows EPERM when Prisma renames query_engine-windows.dll.node.
 * If generate still fails but @prisma/client is already resolvable, exits 0 unless
 * FORCE_PRISMA_GENERATE=1 (then exits 1).
 */

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const SHARED_DB = path.join(__dirname, "..", "shared", "db");
const MAX_ATTEMPTS = 5;
const DELAY_MS = 2000;

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

function isPrismaClientResolvable() {
  try {
    const resolved = require.resolve("@prisma/client", { paths: [path.join(__dirname, "..")] });
    return Boolean(resolved && fs.existsSync(resolved));
  } catch {
    return false;
  }
}

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
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

if (process.env.FORCE_PRISMA_GENERATE === "1") {
  process.exit(1);
}

if (isPrismaClientResolvable()) {
  console.warn(
    "[prebuild] prisma generate failed after retries, but @prisma/client is present — continuing build. " +
      "Stop other Node processes or fix AV locks if you need a fresh generate. Use FORCE_PRISMA_GENERATE=1 to fail hard.",
  );
  process.exit(0);
}

process.exit(1);
