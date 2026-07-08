#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { loadMobileCentreCatalog } = require("./full-catalog/discover-mobilecentre.cjs");
const { discoverYerevanMobileCatalog } = require("./full-catalog/discover-yerevanmobile.cjs");
const { loadSamsungDbCatalog } = require("./full-catalog/db-catalog.cjs");
const { buildCatalogPlan } = require("./full-catalog/plan.cjs");
const { writeMarkdownReport } = require("./full-catalog/report.cjs");
const { applyCatalogPlan } = require("./full-catalog/apply.cjs");
const {
  OUT_DIR,
  DRY_RUN_JSON,
} = require("./full-catalog/constants.cjs");

function parseArgs(argv) {
  const args = new Set(argv);
  return {
    dryRun: args.has("--dry-run") || !args.has("--apply"),
    apply: args.has("--apply"),
    confirm: args.has("--confirm-samsung-full-catalog"),
    skipR2: args.has("--skip-r2"),
    ymOnly: args.has("--ym-only"),
    mcOnly: args.has("--mc-only"),
  };
}

async function runDryRun(options) {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const mcCatalog = options.mcOnly || !options.ymOnly ? loadMobileCentreCatalog() : { discovered: [], rejected: [] };
  const ymCatalog =
    options.ymOnly || !options.mcOnly
      ? await discoverYerevanMobileCatalog({ log: (msg) => console.log(msg) })
      : { discovered: [], rejected: [], notFound: [], parserIssues: [], manualReview: [] };

  const dbCatalog = await loadSamsungDbCatalog();
  const plan = buildCatalogPlan({
    mcCatalog,
    ymCatalog,
    dbCatalog,
    rejected: mcCatalog.rejected,
    notFound: ymCatalog.notFound,
    parserIssues: ymCatalog.parserIssues,
  });

  plan.mode = "dry-run";
  fs.writeFileSync(DRY_RUN_JSON, JSON.stringify(plan, null, 2), "utf8");
  writeMarkdownReport(plan);

  console.log("\nDry-run complete.");
  console.log("Summary:", JSON.stringify(plan.summary, null, 2));
  console.log("JSON:", DRY_RUN_JSON);
  console.log("Report:", path.join(OUT_DIR, "samsung-full-catalog-report.md"));

  if (plan.summary.apply_blocked) {
    console.warn("\nApply is BLOCKED until parser/duplicate issues are resolved.");
    process.exitCode = 2;
  }

  return plan;
}

async function runApply(options) {
  if (!fs.existsSync(DRY_RUN_JSON)) {
    throw new Error(`Dry-run JSON not found. Run with --dry-run first: ${DRY_RUN_JSON}`);
  }

  const payload = JSON.parse(fs.readFileSync(DRY_RUN_JSON, "utf8"));
  const result = await applyCatalogPlan(payload, {
    skipR2: options.skipR2,
    confirmFlag: options.confirm,
  });

  console.log("\nApply complete.");
  console.log("Summary:", JSON.stringify(result.summary, null, 2));
  return result;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.apply) {
    await runApply(options);
    return;
  }
  await runDryRun(options);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("FATAL:", error.message);
    process.exit(1);
  });
}

module.exports = { runDryRun, runApply, parseArgs };
