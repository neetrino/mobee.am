"use strict";

const fs = require("fs");
const { REPORT_MD } = require("./constants.cjs");

function actionLabel(product) {
  return product.proposed_action.replace(/_/g, " ");
}

function writeMarkdownReport(plan, outputPath = REPORT_MD) {
  const lines = [];
  const s = plan.summary;

  lines.push(
    "# Samsung Full Catalog Import / Backfill Report",
    "",
    "## Summary",
    "",
    `- Dry-run status: **${plan.apply_blocked ? "blocked" : "ready for review"}**`,
    `- Whitelist models: ${s.whitelist_models}`,
    `- Ready to import (new): ${s.ready_new_products}`,
    `- Ready to backfill (existing): ${s.ready_backfill_products}`,
    `- Already complete: ${s.already_complete}`,
    `- Duplicates skipped: ${s.duplicates_skipped}`,
    `- Rejected: ${s.rejected}`,
    `- Source not found / parser issues: ${s.source_not_found + s.parser_errors}`,
    `- Manual review: ${s.manual_review}`,
    `- MC sources parsed: ${plan.sources.mobilecentre}`,
    `- YM sources parsed: ${plan.sources.yerevanmobile}`,
    "",
    "## Product table",
    "",
    "| Product | Source | Before variants | Parsed variants | Description (before→parsed) | Action | Status |",
    "| --- | --- | ---: | ---: | --- | --- | --- |",
  );

  for (const product of plan.products) {
    const desc = `${product.before.descriptionHtml_length}→${product.parsed.descriptionHtml_length}`;
    lines.push(
      `| ${product.product_name} | ${product.source || "—"} | ${product.before.variants_count} | ${product.parsed.variants_count} | ${desc} | ${actionLabel(product)} | ${product.db_status} |`,
    );
  }

  lines.push("", "## Rejected / skipped", "", "| Item | Source | Reason |", "| --- | --- | --- |");
  for (const row of plan.sections.rejected) {
    lines.push(`| ${row.model || row.product_name || "—"} | ${row.source || "—"} | ${row.reason} |`);
  }
  for (const row of plan.sections.duplicates_skipped) {
    lines.push(`| ${row.product_name} | ${row.source || "—"} | skip_duplicate |`);
  }
  if (!plan.sections.rejected.length && !plan.sections.duplicates_skipped.length) {
    lines.push("| — | — | — |");
  }

  lines.push("", "## Safety checks", "");
  lines.push(`- Parser errors: ${plan.safety.has_parser_errors ? "yes" : "no"}`);
  lines.push(`- Duplicate variant keys: ${plan.safety.has_duplicate_variant_keys ? "yes" : "no"}`);
  lines.push(
    `- Variants with cart/order refs (generic retire blocked): ${plan.safety.variants_with_cart_order_refs.length}`,
  );
  lines.push(`- Apply blocked: ${plan.summary.apply_blocked ? "yes" : "no"}`);

  lines.push("", "## Sections", "");
  lines.push(`1. Ready to import new products: ${s.ready_new_products}`);
  lines.push(`2. Ready to backfill existing products: ${s.ready_backfill_products}`);
  lines.push(`3. Existing products already complete: ${s.already_complete}`);
  lines.push(`4. Duplicates skipped: ${s.duplicates_skipped}`);
  lines.push(`5. Rejected accessories/non-phone/wrong matches: ${s.rejected}`);
  lines.push(`6. Source not found / parser issues: ${s.source_not_found + s.parser_errors}`);
  lines.push(`7. Products needing manual review: ${s.manual_review}`);
  lines.push("");

  fs.mkdirSync(require("path").dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, lines.join("\n"), "utf8");
  return outputPath;
}

module.exports = { writeMarkdownReport };
