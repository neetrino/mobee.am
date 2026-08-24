"use strict";

const path = require("path");
const fs = require("fs");
const { OUT_DIR } = require("./dry-run.cjs");

function countBySource(products, source) {
  return products.filter((p) => p.primary_source === source || (p.source_urls || []).some((u) => u.includes(source))).length;
}

function writeReport(payload, { imported = [], failed = [], mode = "dry-run" } = {}) {
  const s = payload.summary;
  const lines = [];
  lines.push("# Apple Source Import Report");
  lines.push("");
  lines.push(`> Generated: ${new Date().toISOString()}`);
  lines.push(`> Mode: **${mode}**`);
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("| -------------------------- | ----: |");
  lines.push(`| Targets checked | ${s.target_count} |`);
  lines.push(`| Found on MobileCentre | ${countBySource(payload.all_discovered_products || [], "mobilecentre")} |`);
  lines.push(`| Found on YerevanMobile | ${countBySource(payload.all_discovered_products || [], "yerevanmobile")} |`);
  lines.push(`| Found on iSpace | ${countBySource(payload.all_discovered_products || [], "ispace")} |`);
  lines.push(`| Ready to import | ${s.ready_to_import_parent_products} |`);
  lines.push(`| Imported | ${imported.length} |`);
  lines.push(`| Already existed in DB | ${s.already_exists_in_db} |`);
  lines.push(`| Not found on all 3 sources | ${s.not_found_on_allowed_sources} |`);
  lines.push(`| Rejected as wrong match | ${s.rejected} |`);
  lines.push(`| Failed | ${failed.length} |`);
  lines.push("");

  lines.push("## Products Imported");
  lines.push("");
  lines.push("| Target | Imported product | DB product ID | Variants | Source used | Source URLs |");
  lines.push("| ------ | ---------------- | ------------- | -------- | ----------- | ----------- |");
  if (!imported.length) lines.push("| — | — | — | — | — | — |");
  for (const row of imported) {
    lines.push(`| ${row.target} | ${row.product} | ${row.productId || "—"} | ${row.variants || 0} | ${row.source || "—"} | ${(row.urls || []).slice(0, 2).join("; ")} |`);
  }
  lines.push("");

  lines.push("## Products Found But Not Imported");
  lines.push("");
  lines.push("| Target | Source | URL | Reason |");
  lines.push("| ------ | ------ | --- | ------ |");
  const foundNotImported = (payload.not_added || []).filter((x) => x.reason && !/not_found/.test(x.reason));
  if (!foundNotImported.length) lines.push("| — | — | — | — |");
  for (const r of foundNotImported.slice(0, 80)) {
    lines.push(`| ${r.target || "—"} | ${r.source || "—"} | ${r.url || "—"} | ${r.reason || r.status || "—"} |`);
  }
  lines.push("");

  lines.push("## Products Not Found On Approved Sources");
  lines.push("");
  lines.push("| Target | Checked queries | Notes |");
  lines.push("| ------ | --------------- | ----- |");
  const notFound = (payload.not_added || []).filter((x) => x.reason === "not_found_on_allowed_sources");
  if (!notFound.length) lines.push("| — | — | — |");
  for (const r of notFound) {
    lines.push(`| ${r.target} | MobileCentre, YerevanMobile, iSpace | ${r.category || ""} ${r.year || ""}`.trim() + " |");
  }
  lines.push("");

  lines.push("## Rejected Matches");
  lines.push("");
  lines.push("| Target | Rejected product | Source | URL | Reason |");
  lines.push("| ------ | ---------------- | ------ | --- | ------ |");
  const rejected = (payload.not_added || []).filter((x) => x.status === "rejected_or_skipped" && x.product);
  if (!rejected.length) lines.push("| — | — | — | — | — |");
  for (const r of rejected.slice(0, 40)) {
    lines.push(`| ${r.target || "—"} | ${r.product || "—"} | ${r.source || "—"} | ${r.url || "—"} | ${r.reason || "—"} |`);
  }
  lines.push("");

  lines.push("## Already Existing In DB");
  lines.push("");
  lines.push("| Target | Existing DB product | Product ID | Reason |");
  lines.push("| ------ | ------------------- | ---------- | ------ |");
  const existing = (payload.not_added || []).filter((x) => x.reason === "already_exists_in_db");
  if (!existing.length) lines.push("| — | — | — | — |");
  for (const r of existing) {
    lines.push(`| ${r.target} | — | ${r.db_product_id || "—"} | already_exists_in_db |`);
  }
  lines.push("");

  lines.push("## Variant Summary");
  lines.push("");
  lines.push("| Product | Storage | Colors | Connectivity | Variant count |");
  lines.push("| ------- | ------- | ------ | ------------ | ------------- |");
  for (const p of payload.products || []) {
    lines.push(
      `| ${p.normalized_model} | ${(p.available_options?.storage || []).join(", ") || "—"} | ${(p.available_options?.color || []).join(", ") || "—"} | ${(p.available_options?.connectivity || []).join(", ") || "—"} | ${p.variant_count} |`
    );
  }
  lines.push("");

  lines.push("## Source Parser Notes");
  lines.push("");
  lines.push("- **MobileCentre**: reuses existing `1.py` scraper with targets TSV; variant galleries + specs preserved.");
  lines.push("- **iSpace**: category crawl + product page parse; search endpoint returns 422 — category discovery used instead.");
  lines.push("- **YerevanMobile**: slug probing + Apple category pages; Magento configurable options when present.");
  lines.push("- **iPad mini OLED**: only imported if source title/spec explicitly mentions OLED.");
  lines.push("- Out-of-stock products are included in JSON with `stock_status` when page exists.");
  lines.push("");

  lines.push("## Commands Used");
  lines.push("");
  lines.push("```bash");
  lines.push("node scripts/product-import/pipelines/apple/run-apple-source-import.cjs --dry-run");
  lines.push("# node scripts/product-import/pipelines/apple/run-apple-source-import.cjs --import");
  lines.push("```");
  lines.push("");

  lines.push("## Final Recommendation");
  lines.push("");
  if (mode === "dry-run") {
    lines.push(`- Dry-run complete: **${s.ready_to_import_parent_products}** parent products ready, **${s.not_found_on_allowed_sources}** targets not found on any approved source.`);
    lines.push("- Review `audit/product-import/apple/new-apple-products.json` before running `--import`.");
  } else {
    lines.push(`- Import finished: **${imported.length}** products created/updated.`);
    if (failed.length) lines.push(`- **${failed.length}** failures need manual review (see import-result.json).`);
  }
  if (s.not_found_on_allowed_sources > 0) {
    lines.push("- Future 2026 models (Watch Series 12, HomePad, AirPods Ultra, etc.) likely need another source or manual catalog entry.");
  }
  lines.push("");

  const reportPath = path.join(OUT_DIR, "apple-source-import-report.md");
  fs.writeFileSync(reportPath, lines.join("\n"), "utf8");
  return reportPath;
}

module.exports = { writeReport };
