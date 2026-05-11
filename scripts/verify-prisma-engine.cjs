const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.join(__dirname, "..");
const GENERATED_DIRS = [
  path.join(REPO_ROOT, "shared", "db", "generated", "client"),
  path.join(REPO_ROOT, "generated", "client"),
];
const REQUIRED_ENGINE_NAMES = [
  "libquery_engine-rhel-openssl-3.0.x.so.node",
  "query-engine-rhel-openssl-3.0.x",
];
const SHOULD_FAIL_HARD =
  process.env.VERCEL === "1" || process.env.VERCEL === "true";

function hasRequiredEngineInDir(targetDir) {
  return REQUIRED_ENGINE_NAMES.some((engineName) =>
    fs.existsSync(path.join(targetDir, engineName)),
  );
}

function collectStatuses() {
  return GENERATED_DIRS.map((targetDir) => ({
    targetDir,
    exists: fs.existsSync(targetDir),
    hasEngine: hasRequiredEngineInDir(targetDir),
  }));
}

function formatStatusLine(status) {
  return `${status.targetDir} (exists=${status.exists}, hasEngine=${status.hasEngine})`;
}

const statuses = collectStatuses();
const hasEngineSomewhere = statuses.some((status) => status.hasEngine);

if (hasEngineSomewhere) {
  console.log("[prebuild] Prisma engine verification passed.");
  process.exit(0);
}

const details = statuses.map(formatStatusLine).join("\n");
const message =
  "[prebuild] Prisma Linux engine was not found in generated client folders.\n" +
  `Checked:\n${details}\n` +
  "Expected one of:\n" +
  `- ${REQUIRED_ENGINE_NAMES.join("\n- ")}`;

if (SHOULD_FAIL_HARD) {
  console.error(message);
  process.exit(1);
}

console.warn(message);
process.exit(0);
