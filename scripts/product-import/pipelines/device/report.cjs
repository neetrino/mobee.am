"use strict";

const path = require("path");
const fs = require("fs");
const { OUT_DIR } = require("./dry-run.cjs");
const {
  isDysonHardRejected,
  isPlayStationHardRejected,
  isDysonHairDevice,
  isPlayStationConsoleProduct,
  normalizeDysonProductFamily,
  categorySlugForParentModel,
} = require("./normalize.cjs");
const { DYSON_HAIR_PARENT_MODELS } = require("./targets.cjs");

function safetyCheck(payload) {
  const flat = payload.flat_variants || [];
  const products = payload.products || [];
  const titles = flat.map((row) => row.name || "").join(" | ");

  const hasNonHairReady = products.some((product) => {
    if (product.product_type !== "dyson") return false;
    return !DYSON_HAIR_PARENT_MODELS.includes(product.normalized_model);
  });

  const hasAccessory = flat.some((row) => {
    const family = normalizeDysonProductFamily(row.name, row.model, row.source_url);
    return family === "reject-accessory";
  });

  const hasUnknown = flat.some((row) => {
    if (row.product_type !== "dyson") return false;
    return normalizeDysonProductFamily(row.name, row.model, row.source_url) === "unknown-hair-device";
  });

  const mergedGenerations = products.some((product) => {
    const models = new Set(
      (product.variants || []).map((v) => (v.options?.model_code || "").toUpperCase()).filter(Boolean),
    );
    if (product.normalized_model?.includes("Airwrap") && models.size > 1) {
      const gens = [...models].filter((m) => /^HS0[589]$/.test(m));
      return gens.length > 1;
    }
    return false;
  });

  const wrongCategory = products.some((product) => {
    if (product.product_type !== "dyson") return false;
    const expected = categorySlugForParentModel(product.normalized_model);
    if (!expected) return true;
    if (expected === "hair-stylers" && /hair.?dryers/i.test(product.category || "")) return true;
    if (expected === "hair-straighteners" && /hair.?dryers/i.test(product.category || "")) return true;
    return false;
  });

  const hasDysonAccessory = flat.some((row) => isDysonHardRejected(row.name, row.model, row.source_url));
  const hasNonHairDryerDyson = flat.some(
    (row) => row.product_type === "dyson" && !isDysonHairDevice(row.name, row.model, row.source_url),
  );
  const hasGames = /\bgift card\b/i.test(titles);
  const hasControllers = /\bcontroller\b|\bdualsense\b|\bdualshock\b/i.test(titles);
  const hasPsAccessory = flat.some(
    (row) => row.product_type === "playstation" && isPlayStationHardRejected(row.name, row.model, row.source_url),
  );
  const hasNonConsolePs = flat.some(
    (row) =>
      row.product_type === "playstation" && !isPlayStationConsoleProduct(row.name, row.model, row.source_url),
  );
  const pricesOk = flat.every((row) => Number(row.price) > 0);
  const imagesOk = flat.every((row) => Boolean(row.image_url || (row.gallery && row.gallery.length)));

  return {
    "Only approved Dyson hair devices ready": hasNonHairReady || hasUnknown ? "FAIL" : "PASS",
    "No standalone accessories ready": hasAccessory || hasDysonAccessory ? "FAIL" : "PASS",
    "No non-hair Dyson ready": hasNonHairDryerDyson ? "FAIL" : "PASS",
    "Airwrap generations not merged": mergedGenerations ? "FAIL" : "PASS",
    "Correct Dyson categories": wrongCategory ? "FAIL" : "PASS",
    "No PlayStation gift cards imported": hasGames ? "FAIL" : "PASS",
    "No PlayStation controllers imported": hasControllers ? "FAIL" : "PASS",
    "No PS accessories imported": hasPsAccessory ? "FAIL" : "PASS",
    "Only consoles accepted": hasNonConsolePs ? "FAIL" : "PASS",
    "Prices exist": pricesOk ? "PASS" : "FAIL",
    "Images exist": imagesOk ? "PASS" : "FAIL",
  };
}

function writeReport(payload, { mode = "dry-run", importResult = null, exitCode = 0 } = {}) {
  const summary = payload.summary || {};
  const safety = safetyCheck(payload);

  const dysonReady = (payload.products || []).filter((row) => row.product_type === "dyson").length;
  const psReady = (payload.products || []).filter((row) => row.product_type === "playstation").length;

  const lines = [];
  lines.push("# Device Source Import Report");
  lines.push("");
  lines.push(`> Generated: ${new Date().toISOString()}`);
  lines.push(`> Mode: **${mode}**`);
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("| ---------------------- | ----: |");
  lines.push(`| Dyson targets | ${summary.dyson_targets ?? DYSON_HAIR_PARENT_MODELS.length} |`);
  lines.push(`| PlayStation targets | ${summary.playstation_targets ?? 8} |`);
  lines.push(`| Found on MobileCentre | ${summary.found_on_mobilecentre ?? 0} |`);
  lines.push(`| Found on YerevanMobile | ${summary.found_on_yerevanmobile ?? 0} |`);
  lines.push(`| Ready parent products | ${summary.ready_parent_products ?? 0} |`);
  lines.push(`| Ready variants | ${summary.ready_variants ?? 0} |`);
  lines.push(`| Already existed in DB | ${summary.already_exists_in_db ?? 0} |`);
  lines.push(`| Found but not imported | ${summary.found_but_not_imported ?? 0} |`);
  lines.push(`| Rejected | ${summary.rejected ?? 0} |`);
  lines.push(`| Failed | ${summary.failed ?? 0} |`);
  if (importResult?.summary) {
    lines.push(`| Imported parent products | ${importResult.summary.parent_products_created ?? 0} |`);
    lines.push(`| Imported variants | ${importResult.summary.variants_created ?? 0} |`);
  }
  lines.push("");

  lines.push("## Ready To Import");
  lines.push("");
  lines.push("| Product | Type | Category | Variants | Source | Price range | Source URLs |");
  lines.push("| ------- | ---- | -------- | -------: | ------ | ----------: | ----------- |");
  if (!(payload.products || []).length) lines.push("| — | — | — | — | — | — | — |");
  for (const product of payload.products || []) {
    const range =
      product.price_min != null && product.price_max != null
        ? `${product.price_min}-${product.price_max} AMD`
        : "—";
    lines.push(
      `| ${product.normalized_model} | ${product.product_type} | ${product.category || "—"} | ${product.variant_count} | ${product.primary_source} | ${range} | ${(product.source_urls || []).slice(0, 2).join("; ")} |`,
    );
  }
  lines.push("");

  lines.push("## Variant Detail");
  lines.push("");
  lines.push("| Parent | Model | Color | Kit | Hair type | Price | Source | Images | Desc HTML | DB |");
  lines.push("| ------ | ----- | ----- | --- | --------- | ----: | ------ | -----: | --------: | -- |");
  for (const product of payload.products || []) {
    for (const variant of product.variants || []) {
      lines.push(
        `| ${product.normalized_model} | ${variant.options?.model_code || "—"} | ${variant.options?.color || "—"} | ${variant.options?.kit || "—"} | ${variant.options?.hair_type || "—"} | ${variant.price || "—"} | ${variant.source} | ${(variant.gallery || []).length} | ${(variant.descriptionHtml || product.descriptionHtml || "").length} | ${variant.db_status || "—"} |`,
      );
    }
  }
  lines.push("");

  lines.push("## Already Exists In DB");
  lines.push("");
  lines.push("| Product | Existing DB product | DB ID | Reason |");
  lines.push("| ------- | ------------------- | ----- | ------ |");
  if (!(payload.already_exists_in_db || []).length) lines.push("| — | — | — | — |");
  for (const row of payload.already_exists_in_db || []) {
    lines.push(`| ${row.product} | ${row.existing_db_product || "—"} | ${row.db_id || "—"} | ${row.reason} |`);
  }
  lines.push("");

  lines.push("## Found But Not Imported");
  lines.push("");
  lines.push("| Product | Source | URL | Reason |");
  lines.push("| ------- | ------ | --- | ------ |");
  if (!(payload.found_but_not_imported || []).length) lines.push("| — | — | — | — |");
  for (const row of (payload.found_but_not_imported || []).slice(0, 80)) {
    lines.push(`| ${row.product || row.target || "—"} | ${row.source || "—"} | ${row.url || "—"} | ${row.reason} |`);
  }
  lines.push("");

  lines.push("## Rejected");
  lines.push("");
  lines.push("| Product | Source | URL | Reason |");
  lines.push("| ------- | ------ | --- | ------ |");
  if (!(payload.rejected || []).length) lines.push("| — | — | — | — |");
  for (const row of (payload.rejected || []).slice(0, 120)) {
    lines.push(`| ${row.product || "—"} | ${row.source || "—"} | ${row.url || "—"} | ${row.reason} |`);
  }
  lines.push("");

  lines.push("## Safety Checks");
  lines.push("");
  lines.push("| Check | Result |");
  lines.push("| ----------------------------------- | ------ |");
  for (const [label, result] of Object.entries(safety)) {
    lines.push(`| ${label} | ${result} |`);
  }
  lines.push("");

  lines.push("## Commands Used");
  lines.push("");
  lines.push("```bash");
  lines.push(`node scripts/product-import/pipelines/device/run.cjs --dry-run  # exit ${exitCode}`);
  if (mode === "import") {
    lines.push("node scripts/product-import/pipelines/device/run.cjs --import");
    lines.push("node scripts/product-import/pipelines/device/post-import-verification.cjs");
  }
  lines.push("```");
  lines.push("");

  lines.push("## Final Recommendation");
  lines.push("");
  lines.push(`- Dyson hair devices ready: **${dysonReady}** parent products`);
  lines.push(`- PlayStation consoles ready: **${psReady}** parent products`);
  lines.push(`- Ready variants total: **${summary.ready_variants ?? 0}**`);
  lines.push(`- Rejected/skipped: **${(summary.rejected ?? 0) + (summary.found_but_not_imported ?? 0)}**`);

  const canImport =
    (summary.ready_parent_products ?? 0) > 0 &&
    Object.values(safety).every((value) => value === "PASS");

  if (mode === "dry-run") {
    lines.push(
      canImport
        ? "- Import **can run** after manual review of dry-run JSON."
        : "- Import **should not run** until blockers are resolved.",
    );
  } else if (importResult) {
    lines.push(
      importResult.summary?.variants_created > 0
        ? "- Import completed. Run post-import verification and review frontend pages."
        : "- Import produced no new variants.",
    );
  }
  lines.push("");

  const reportPath = path.join(OUT_DIR, "device-source-import-report.md");
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(reportPath, lines.join("\n"), "utf8");
  return reportPath;
}

module.exports = { writeReport, safetyCheck };
