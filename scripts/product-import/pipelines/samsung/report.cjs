"use strict";

const path = require("path");
const fs = require("fs");
const { OUT_DIR } = require("./dry-run.cjs");

function writeDbImportReport(payload, { mode = "dry-run", importResult = null } = {}) {
  const summary = payload.summary;
  const lines = [];
  lines.push("# Samsung DB Import Report");
  lines.push("");
  lines.push(`> Generated: ${new Date().toISOString()}`);
  lines.push(`> Mode: **${mode}**`);
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("| --- | ---: |");
  lines.push(`| Ready parent products | ${summary.ready_parent_products ?? 0} |`);
  lines.push(`| Ready variants | ${summary.ready_variants ?? 0} |`);
  lines.push(`| Already exists in DB | ${summary.already_exists_in_db ?? 0} |`);
  lines.push(`| Skipped | ${summary.skipped ?? 0} |`);
  lines.push(`| Failed | ${summary.failed ?? 0} |`);
  if (importResult?.summary) {
    lines.push(`| Parent products created | ${importResult.summary.parent_products_created} |`);
    lines.push(`| Variants created | ${importResult.summary.variants_created} |`);
    lines.push(`| Duplicates blocked | ${importResult.summary.duplicates} |`);
  }
  lines.push("");

  lines.push("## Ready Products");
  lines.push("");
  lines.push("| Product | Variants | Price range | Storage | RAM | Colors |");
  lines.push("| --- | ---: | ---: | --- | --- | --- |");
  if (!payload.products?.length) {
    lines.push("| — | — | — | — | — | — |");
  } else {
    for (const product of payload.products) {
      const opts = product.available_options || {};
      const priceRange =
        product.price_min && product.price_max
          ? `${product.price_min.toLocaleString()}–${product.price_max.toLocaleString()} AMD`
          : "—";
      lines.push(
        `| ${product.model} | ${product.variant_count} | ${priceRange} | ${(opts.storage || []).join(", ") || "—"} | ${(opts.ram || []).join(", ") || "—"} | ${(opts.color || []).join(", ") || "—"} |`,
      );
    }
  }
  lines.push("");

  if (importResult?.created_products?.length) {
    lines.push("## Created Products");
    lines.push("");
    lines.push("| Product | DB ID | Variants created |");
    lines.push("| --- | --- | ---: |");
    for (const row of importResult.created_products) {
      lines.push(`| ${row.model} | ${row.product_id} | ${row.variants_created} |`);
    }
    lines.push("");
  }

  if (payload.skipped?.length) {
    lines.push("## Skipped");
    lines.push("");
    lines.push("| Model | Reason | Notes |");
    lines.push("| --- | --- | --- |");
    for (const row of payload.skipped.slice(0, 40)) {
      lines.push(`| ${row.model || row.variant || "—"} | ${row.reason} | ${row.notes || ""} |`);
    }
    lines.push("");
  }

  lines.push("## Commands");
  lines.push("");
  lines.push("```bash");
  lines.push("node scripts/product-import/pipelines/samsung/run-samsung-source-import.cjs --dry-run");
  lines.push("# node scripts/product-import/pipelines/samsung/run-samsung-source-import.cjs --import");
  lines.push("```");
  lines.push("");

  const reportPath = path.join(OUT_DIR, "samsung-db-import-report.md");
  fs.writeFileSync(reportPath, lines.join("\n"), "utf8");
  return reportPath;
}

module.exports = { writeDbImportReport };
