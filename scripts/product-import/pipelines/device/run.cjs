#!/usr/bin/env node
"use strict";

const path = require("path");
const { runDryRun, OUT_DIR } = require("./dry-run.cjs");
const { runImport } = require("./import-to-db.cjs");
const { writeReport } = require("./report.cjs");

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run") || !args.includes("--import");
  const skipR2 = args.includes("--skip-r2");
  const skipMc = args.includes("--skip-mobilecentre");
  const skipYm = args.includes("--skip-yerevanmobile");

  console.log("Device Source Import Pipeline");
  console.log("Output dir:", OUT_DIR);
  console.log("Scope: Dyson hair care (dryers/stylers/straighteners) + PlayStation consoles");
  console.log("Sources: MobileCentre, YerevanMobile (no iSpace)");

  if (isDryRun) {
    console.log("\n=== DRY RUN (no DB writes) ===\n");
    const payload = await runDryRun({ skipMobileCentre: skipMc, skipYerevanMobile: skipYm });
    const reportPath = writeReport(payload, { mode: "dry-run", exitCode: 0 });
    console.log("\nDry-run summary:", JSON.stringify(payload.summary, null, 2));
    console.log("JSON:", path.join(OUT_DIR, "device-products.dry-run.json"));
    console.log("Variable JSON:", path.join(OUT_DIR, "device-products.variable.json"));
    console.log("Flat JSON:", path.join(OUT_DIR, "device-products.flat-variants.json"));
    console.log("Report:", reportPath);
    return;
  }

  console.log("\n=== IMPORT MODE ===\n");
  const importResult = await runImport({ skipR2 });
  const dryPath = path.join(OUT_DIR, "device-products.dry-run.json");
  const payload = JSON.parse(require("fs").readFileSync(dryPath, "utf8"));
  const reportPath = writeReport(payload, { mode: "import", importResult, exitCode: 0 });
  console.log("\nImport result:", JSON.stringify(importResult.summary, null, 2));
  console.log("Result JSON:", path.join(OUT_DIR, "device-import-result.json"));
  console.log("Report:", reportPath);
}

main().catch((error) => {
  console.error("FATAL:", error.message);
  process.exit(1);
});
