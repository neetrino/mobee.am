"use strict";

const path = require("path");
const fs = require("fs");
const {
  DYSON_HAIR_PARENT_MODELS,
  PLAYSTATION_CONSOLE_PARENT_MODELS,
  DEVICE_TARGETS,
} = require("./targets.cjs");
const { validateVariantForImport, categoryForParentModel } = require("./normalize.cjs");
const { searchMobileCentre } = require("./providers/mobilecentre.cjs");
const { searchYerevanMobile } = require("./providers/yerevanmobile.cjs");
const { buildVariableProducts } = require("./build-variable-products.cjs");
const { loadExistingCatalog, annotateWithDbStatus } = require("./check-existing-db.cjs");

const OUT_DIR = path.join(__dirname, "../../../../audit/product-import/device");

function filterAndValidateVariants(variants) {
  const matched = [];
  const rejected = [];

  for (const variant of variants) {
    const check = validateVariantForImport(variant);
    if (!check.ok) {
      rejected.push({
        product: variant.name,
        target: variant.target_model,
        source: variant.source,
        url: variant.source_url,
        reason: check.reason,
      });
      continue;
    }
    variant.normalized_model = check.normalized;
    variant.product_type = check.type;
    variant.category = check.category || categoryForParentModel(check.normalized) || variant.category;
    matched.push(variant);
  }

  return { matched, rejected };
}

function countBySource(items, source) {
  return items.filter((row) => row.source === source || (row.source_urls || []).some((url) => url.includes(source))).length;
}

async function runDryRun({ skipMobileCentre = false, skipYerevanMobile = false } = {}) {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const flat = [];
  const rejected = [];
  const failed = [];
  const foundBySource = { mobilecentre: 0, yerevanmobile: 0 };

  if (!skipMobileCentre) {
    try {
      const result = await searchMobileCentre(DEVICE_TARGETS);
      const { matched, rejected: localRejected } = filterAndValidateVariants(result.variants);
      flat.push(...matched);
      rejected.push(...localRejected, ...result.rejected);
      failed.push(...result.failed);
      foundBySource.mobilecentre = matched.length;
    } catch (error) {
      failed.push({ source: "mobilecentre", reason: "blocked_or_failed", error: error.message });
      console.error("[mobilecentre] FAILED:", error.message);
    }
  }

  if (!skipYerevanMobile) {
    try {
      const result = await searchYerevanMobile(DEVICE_TARGETS);
      const { matched, rejected: localRejected } = filterAndValidateVariants(result.variants);
      flat.push(...matched);
      rejected.push(...localRejected, ...result.rejected);
      failed.push(...result.failed);
      foundBySource.yerevanmobile = matched.length;
    } catch (error) {
      failed.push({ source: "yerevanmobile", reason: "blocked_or_failed", error: error.message });
      console.error("[yerevanmobile] FAILED:", error.message);
    }
  }

  const variableProducts = buildVariableProducts(flat);
  const catalog = await loadExistingCatalog();
  const annotated = annotateWithDbStatus(variableProducts, catalog);

  const readyProducts = annotated.filter((product) => product.ready_to_import);
  const existingProducts = annotated.filter((product) => product.db_status === "exists");
  const foundButNotImported = annotated.filter((product) => !product.ready_to_import && product.db_status !== "exists");

  const foundTargets = new Set(flat.map((variant) => variant.target_model).filter(Boolean));
  const missingTargets = DEVICE_TARGETS.filter((target) => !foundTargets.has(target.model)).map((target) => ({
    target: target.model,
    type: target.type,
    reason: "not_found_on_allowed_sources",
  }));

  const readyVariants = readyProducts.reduce(
    (sum, product) => sum + product.variants.filter((variant) => variant.db_status === "new").length,
    0,
  );

  const payload = {
    generated_at: new Date().toISOString(),
    summary: {
      mode: "dry-run",
      sources: ["mobilecentre", "yerevanmobile"].filter((source) =>
        source === "mobilecentre" ? !skipMobileCentre : !skipYerevanMobile,
      ),
      dyson_targets: DYSON_HAIR_PARENT_MODELS.length,
      playstation_targets: PLAYSTATION_CONSOLE_PARENT_MODELS.length,
      dyson_ready_parents: readyProducts.filter((p) => p.product_type === "dyson").length,
      playstation_ready_parents: readyProducts.filter((p) => p.product_type === "playstation").length,
      found_on_mobilecentre: foundBySource.mobilecentre,
      found_on_yerevanmobile: foundBySource.yerevanmobile,
      ready_parent_products: readyProducts.length,
      ready_variants: readyVariants,
      already_exists_in_db: existingProducts.length,
      found_but_not_imported: foundButNotImported.length + missingTargets.length,
      rejected: rejected.length,
      failed: failed.length,
    },
    products: readyProducts,
    already_exists_in_db: existingProducts.map((product) => ({
      product: product.normalized_model,
      existing_db_product: product.db_match?.product?.title || product.normalized_model,
      db_id: product.db_match?.product?.id,
      reason: product.db_match?.reason || "exists",
      variant_count: product.variant_count,
    })),
    found_but_not_imported: [
      ...foundButNotImported.map((product) => ({
        product: product.normalized_model,
        source: product.primary_source,
        url: (product.source_urls || [])[0] || "",
        reason: product.db_status === "partial" ? "partial_exists_in_db" : "validation_or_gate_failed",
      })),
      ...missingTargets,
    ],
    rejected,
    failed,
    all_discovered_products: annotated,
    flat_variants: flat,
    variable_products: variableProducts,
  };

  fs.writeFileSync(path.join(OUT_DIR, "device-products.dry-run.json"), JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "device-products.variable.json"), JSON.stringify(variableProducts, null, 2), "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "device-products.flat-variants.json"), JSON.stringify(flat, null, 2), "utf8");

  return payload;
}

module.exports = { runDryRun, OUT_DIR, countBySource };
