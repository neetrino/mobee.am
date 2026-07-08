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
  const allowNoPrice = args.includes("--allow-no-price");
  const importAsDraft = args.includes("--import-as-draft");

  console.log("Apple Source Import Pipeline");
  console.log("Output dir:", OUT_DIR);
  if (allowNoPrice) console.log("No-price mode: ON (allowlist targets only)");
  if (importAsDraft) console.log("Import as draft: ON");

  if (isDryRun) {
    console.log("\n=== DRY RUN (no DB writes) ===\n");
    const payload = await runDryRun({ skipMobileCentre: skipMc, allowNoPrice });
    const reportPath = writeReport(payload, { mode: "dry-run" });
    console.log("\nDry-run summary:", JSON.stringify(payload.summary, null, 2));
    console.log("JSON:", path.join(OUT_DIR, "new-apple-products.json"));
    console.log("Report:", reportPath);
    return;
  }

  console.log("\n=== IMPORT MODE ===\n");
  const importResult = await runImport({ skipR2, importAsDraft });
  const dryPath = path.join(OUT_DIR, "new-apple-products.dry-run.json");
  const payload = JSON.parse(require("fs").readFileSync(dryPath, "utf8"));
  const reportPath = writeReport(payload, {
    mode: "import",
    imported: importResult.imported || [],
    failed: importResult.failed || [],
  });
  console.log("\nImport result:", JSON.stringify(importResult, null, 2));
  console.log("Report:", reportPath);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
