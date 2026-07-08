"use strict";

const path = require("path");
const fs = require("fs");
const { validateVariantForImport, isWhitelistedParentModel } = require("../whitelist.cjs");
const { variantDedupeKey, slugify } = require("../normalize.cjs");
const { normalizeVariantOptions } = require("../../../shared/samsung-attribute-normalize.cjs");
const { buildDescriptionHtml } = require("../../../shared/mobilecentre-description-html.cjs");
const { VARIABLE_FILE, FLAT_FILE } = require("./constants.cjs");

function normalizeMcVariantOptions(options) {
  return normalizeVariantOptions(options || {});
}

function loadMobileCentreCatalog() {
  if (!fs.existsSync(VARIABLE_FILE)) {
    throw new Error(`Missing ${VARIABLE_FILE}. Run Samsung scraper first.`);
  }

  const variable = JSON.parse(fs.readFileSync(VARIABLE_FILE, "utf8"));
  const flat = fs.existsSync(FLAT_FILE) ? JSON.parse(fs.readFileSync(FLAT_FILE, "utf8")) : [];
  const flatCount = flat.length;
  const groupedCount = variable.reduce(
    (sum, product) => sum + (product.variant_count || product.variants?.length || 0),
    0,
  );
  if (flatCount && groupedCount !== flatCount) {
    throw new Error(`Grouping mismatch: flat=${flatCount}, grouped=${groupedCount}`);
  }

  const discovered = [];
  const rejected = [];

  for (const parent of variable) {
    const model = parent.model;
    if (!isWhitelistedParentModel(model)) {
      rejected.push({ model, source: "mobilecentre", reason: "parent_not_in_whitelist" });
      continue;
    }

    const validatedVariants = [];
    for (const variant of parent.variants || []) {
      const check = validateVariantForImport({
        ...variant,
        product_url: variant.product_url,
        source_pid: variant.source_pid,
      });
      if (!check.ok) {
        rejected.push({ model, source: "mobilecentre", variant: variant.name, reason: check.reason });
        continue;
      }

      const options = normalizeMcVariantOptions(variant.options);
      validatedVariants.push({
        source: "mobilecentre",
        source_url: variant.product_url,
        source_pid: String(variant.source_pid),
        sku: variant.sku || `mobilecentre-${variant.source_pid}`,
        name: variant.name,
        model,
        price: variant.price,
        currency: variant.currency || "AMD",
        stock_status: "in_stock",
        options,
        image_url: variant.image_url || null,
        gallery: variant.gallery || [],
        dedupe_key: variantDedupeKey({ ...variant, model, options }),
      });
    }

    if (!validatedVariants.length) {
      rejected.push({ model, source: "mobilecentre", reason: "no_valid_variants" });
      continue;
    }

    const descriptionHtml =
      parent.descriptionHtml ||
      validatedVariants.find((variant) => variant.descriptionHtml)?.descriptionHtml ||
      buildDescriptionHtml(parent.description || validatedVariants[0]?.description || null);

    discovered.push({
      source: "mobilecentre",
      model,
      product_name: model,
      product_title: model,
      normalized_model: model,
      slug: slugify(model),
      brand: "Samsung",
      category: parent.category || "Galaxy",
      sourceUrl: validatedVariants[0]?.source_url || null,
      source_urls: [...new Set(validatedVariants.map((variant) => variant.source_url).filter(Boolean))],
      price_min: parent.price_min ?? Math.min(...validatedVariants.map((variant) => variant.price)),
      price_max: parent.price_max ?? Math.max(...validatedVariants.map((variant) => variant.price)),
      gallery: parent.gallery || [],
      gallery_by_color: parent.gallery_by_color || {},
      descriptionHtml,
      variants: validatedVariants,
      variant_count: validatedVariants.length,
      validation_ok: true,
    });
  }

  return { discovered, rejected };
}

module.exports = { loadMobileCentreCatalog };
