#!/usr/bin/env node
"use strict";

const path = require("path");
const fs = require("fs");
const { runImport } = require("./import-yerevanmobile-missing.cjs");

const ROOT = path.join(__dirname, "../../../..");
const OUT_DIR = path.join(ROOT, "audit/product-import/samsung/a16-import");
const DRY_RUN_JSON = path.join(OUT_DIR, "samsung-a16.dry-run.json");
const RESULT_PATH = path.join(OUT_DIR, "samsung-a16-import-result.json");
const TARGET_MODEL = "Samsung Galaxy A16";

function loadDryRun() {
  if (!fs.existsSync(DRY_RUN_JSON)) {
    throw new Error(`Missing ${DRY_RUN_JSON}. Run a16-source-audit.cjs first.`);
  }
  return JSON.parse(fs.readFileSync(DRY_RUN_JSON, "utf8"));
}

function assertSafePayload(payload) {
  const ready = payload.ready_to_import || [];
  if (ready.length !== 1) {
    throw new Error(`Stop: expected exactly 1 ready product, got ${ready.length}`);
  }
  if (ready[0].model !== TARGET_MODEL) {
    throw new Error(`Stop: ready product is ${ready[0].model}, not ${TARGET_MODEL}`);
  }
  if (/\b5g\b/i.test(ready[0].model) || /\b5g\b/i.test(ready[0].product_title || "")) {
    throw new Error("Stop: ready product looks like A16 5G");
  }
  if (ready[0].variant_count !== 1) {
    throw new Error(`Stop: expected exactly 1 variant, got ${ready[0].variant_count}`);
  }
  if (!/Samsung Galaxy A16\s+128GB\s*\(Black\)/i.test(ready[0].product_title || "")) {
    throw new Error("Stop: ready product title is not Samsung Galaxy A16 128GB (Black)");
  }
  if (ready[0].source !== "mobilecentre") {
    throw new Error(`Stop: expected MobileCentre source, got ${ready[0].source || "unknown"}`);
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run") || !args.has("--import");
  const payload = loadDryRun();

  if (!payload.ready_to_import?.length) {
    console.log(JSON.stringify({ mode: dryRun ? "dry-run" : "import", status: "blocked", reason: payload.recommendation }, null, 2));
    if (!dryRun) process.exit(2);
    return;
  }

  assertSafePayload(payload);

  const result = await runImport({
    dryRun,
    skipR2: args.has("--skip-r2"),
    dryRunPath: DRY_RUN_JSON,
    resultPath: RESULT_PATH,
  });

  console.log(JSON.stringify(result, null, 2));
  if (dryRun) {
    console.log("\nDry-run only. To import after a valid source is found:");
    console.log("node scripts/product-import/pipelines/samsung/import-a16.cjs --import");
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("FATAL:", error.message);
    process.exit(1);
  });
}

module.exports = { loadDryRun, assertSafePayload, DRY_RUN_JSON, OUT_DIR, RESULT_PATH, TARGET_MODEL };
