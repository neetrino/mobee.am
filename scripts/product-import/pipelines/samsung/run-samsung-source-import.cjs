#!/usr/bin/env node
"use strict";

const path = require("path");
const { runDryRun, OUT_DIR } = require("./dry-run.cjs");
const { runImport } = require("./import-to-db.cjs");
const { writeDbImportReport } = require("./report.cjs");

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run") || !args.includes("--import");
  const skipR2 = args.includes("--skip-r2");

  console.log("Samsung Source Import Pipeline");
  console.log("Output dir:", OUT_DIR);

  if (isDryRun) {
    console.log("\n=== DRY RUN (no DB writes) ===\n");
    const payload = await runDryRun();
    const reportPath = writeDbImportReport(payload, { mode: "dry-run" });
    console.log("\nDry-run summary:", JSON.stringify(payload.summary, null, 2));
    console.log("JSON:", path.join(OUT_DIR, "samsung-db-import.dry-run.json"));
    console.log("Report:", reportPath);
    return;
  }

  console.log("\n=== IMPORT MODE ===\n");
  const importResult = await runImport({ skipR2 });
  const dryPath = path.join(OUT_DIR, "samsung-db-import.dry-run.json");
  const payload = JSON.parse(require("fs").readFileSync(dryPath, "utf8"));
  const reportPath = writeDbImportReport(payload, { mode: "import", importResult });
  console.log("\nImport result:", JSON.stringify(importResult.summary, null, 2));
  console.log("Result JSON:", path.join(OUT_DIR, "samsung-import-result.json"));
  console.log("Report:", reportPath);
}

main().catch((error) => {
  console.error("FATAL:", error.message);
  process.exit(1);
});
