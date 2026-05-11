const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.join(__dirname, "..");
const SOURCE_DIR = path.join(REPO_ROOT, "shared", "db", "generated", "client");
const TARGET_DIR = path.join(REPO_ROOT, "generated", "client");

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeDirectory(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function copyDirectory(sourceDir, targetDir) {
  fs.cpSync(sourceDir, targetDir, { recursive: true, force: true });
}

function syncPrismaClient() {
  if (!fs.existsSync(SOURCE_DIR)) {
    throw new Error(`Prisma client source directory not found: ${SOURCE_DIR}`);
  }

  removeDirectory(TARGET_DIR);
  ensureDirectory(path.dirname(TARGET_DIR));
  copyDirectory(SOURCE_DIR, TARGET_DIR);
  console.log(`[prebuild] Prisma client synced: ${SOURCE_DIR} -> ${TARGET_DIR}`);
}

if (require.main === module) {
  syncPrismaClient();
}

module.exports = {
  syncPrismaClient,
};
