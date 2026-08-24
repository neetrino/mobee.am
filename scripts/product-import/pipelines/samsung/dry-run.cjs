"use strict";

const path = require("path");
const fs = require("fs");
const { validateVariantForImport, isWhitelistedParentModel } = require("./whitelist.cjs");
const { annotateWithDbStatus } = require("./check-existing-db.cjs");
const { variantDedupeKey } = require("./normalize.cjs");

const ROOT = path.join(__dirname, "../../../..");
const OUT_DIR = path.join(ROOT, "audit/product-import/samsung");
const VARIABLE_FILE = path.join(ROOT, "data/product-import/samsung/mobilecentre_samsung_variable_products.json");
const FLAT_FILE = path.join(ROOT, "data/product-import/samsung/mobilecentre_samsung_flat_variants.json");

function loadProductsFromJson() {
  if (!fs.existsSync(VARIABLE_FILE)) {
    throw new Error(`Missing ${VARIABLE_FILE}. Run Samsung scraper first.`);
  }
  const variable = JSON.parse(fs.readFileSync(VARIABLE_FILE, "utf8"));
  const flat = fs.existsSync(FLAT_FILE) ? JSON.parse(fs.readFileSync(FLAT_FILE, "utf8")) : [];

  const flatCount = flat.length;
  const groupedCount = variable.reduce((sum, product) => sum + (product.variant_count || product.variants?.length || 0), 0);
  if (flatCount && groupedCount !== flatCount) {
    throw new Error(`Grouping mismatch: flat=${flatCount}, grouped=${groupedCount}`);
  }

  return variable.map((parent) => {
    const model = parent.model;
    const skipped = [];
    const validatedVariants = [];

    if (!isWhitelistedParentModel(model)) {
      return {
        ...parent,
        validation_ok: false,
        validation_error: "parent_not_in_whitelist",
        variants: [],
        skipped_variants: parent.variants || [],
      };
    }

    for (const variant of parent.variants || []) {
      const check = validateVariantForImport({
        ...variant,
        product_url: variant.product_url,
        source_pid: variant.source_pid,
      });
      if (!check.ok) {
        skipped.push({ variant, reason: check.reason });
        continue;
      }
      validatedVariants.push({
        ...variant,
        source_url: variant.product_url,
        sku: variant.sku || `mobilecentre-${variant.source_pid}`,
        normalized_model: model,
        dedupe_key: variantDedupeKey({ ...variant, model }),
      });
    }

    const optionValues = {};
    for (const variant of validatedVariants) {
      for (const [key, value] of Object.entries(variant.options || {})) {
        if (!value) continue;
        if (!optionValues[key]) optionValues[key] = new Set();
        optionValues[key].add(String(value));
      }
    }

    return {
      source: "mobilecentre",
      model,
      product_name: model,
      normalized_model: model,
      category: parent.category || "Galaxy",
      currency: parent.currency || "AMD",
      price_min: parent.price_min,
      price_max: parent.price_max,
      primary_source: "mobilecentre",
      source_urls: [...new Set(validatedVariants.map((variant) => variant.product_url).filter(Boolean))],
      available_options: Object.fromEntries(
        Object.entries(optionValues).map(([key, values]) => [key, [...values].sort()]),
      ),
      gallery: parent.gallery || [],
      gallery_by_color: parent.gallery_by_color || {},
      description: parent.description || "",
      descriptionHtml: parent.descriptionHtml || null,
      variants: validatedVariants,
      variant_count: validatedVariants.length,
      validation_ok: validatedVariants.length > 0,
      skipped_variants: skipped,
    };
  });
}

async function runDryRun() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const rawProducts = loadProductsFromJson();
  const { loadExistingCatalog } = require("./check-existing-db.cjs");
  const catalog = await loadExistingCatalog();
  const annotated = annotateWithDbStatus(rawProducts, catalog);

  const products = annotated.filter((product) => product.ready_to_import);
  const alreadyExists = annotated.filter((product) => product.db_status === "exists");
  const skipped = annotated.filter((product) => !product.validation_ok && product.db_status !== "exists");
  const failed = annotated.flatMap((product) =>
    (product.skipped_variants || []).map((row) => ({
      model: product.model,
      variant: row.variant?.name,
      reason: row.reason,
    })),
  );

  const readyVariants = products.reduce(
    (sum, product) => sum + product.variants.filter((variant) => variant.db_status === "new").length,
    0,
  );

  const payload = {
    generated_at: new Date().toISOString(),
    summary: {
      mode: "dry-run",
      ready_parent_products: products.length,
      ready_variants: readyVariants,
      already_exists_in_db: alreadyExists.length,
      skipped: skipped.length + failed.length,
      failed: failed.length,
      variable_products_total: annotated.length,
    },
    products,
    already_exists_in_db: alreadyExists.map((product) => ({
      model: product.model,
      db_product_id: product.db_match?.product?.id,
      db_title: product.db_match?.product?.title,
      reason: product.db_match?.reason,
      variant_count: product.variant_count,
    })),
    skipped: [
      ...skipped.map((product) => ({
        model: product.model,
        reason: product.validation_error || "validation_failed",
        notes: `validated_variants=${product.variant_count}`,
      })),
      ...failed,
    ],
    failed,
    all_products: annotated,
  };

  fs.writeFileSync(path.join(OUT_DIR, "samsung-db-import.dry-run.json"), JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

module.exports = { runDryRun, OUT_DIR, VARIABLE_FILE, FLAT_FILE };
