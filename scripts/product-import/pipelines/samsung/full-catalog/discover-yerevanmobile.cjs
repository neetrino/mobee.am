"use strict";

const { fetchHtml } = require("../../apple/http.cjs");
const { SAMSUNG_PHONE_WHITELIST } = require("../whitelist.constants.cjs");
const { searchTargetModel } = require("../yerevanmobile-missing-check.cjs");
const { parseYerevanMobileDescriptionHtml } = require("../../../shared/yerevanmobile-description.cjs");
const { normalizeVariantOptions } = require("../../../shared/samsung-attribute-normalize.cjs");
const { variantDedupeKey, slugify } = require("../normalize.cjs");

function normalizeYmVariants(hit) {
  return hit.variants.map((variant) => {
    const options = normalizeVariantOptions(variant.options || {});
    return {
      ...variant,
      source: "yerevanmobile",
      source_url: variant.source_url || hit.source_url,
      source_pid: String(variant.source_pid),
      model: hit.target_model,
      product_url: variant.product_url || hit.source_url,
      options,
      dedupe_key: variantDedupeKey({ ...variant, model: hit.target_model, options }),
    };
  });
}

async function enrichHitWithDescription(hit) {
  const url = hit.source_url;
  const { text, status } = await fetchHtml(url, { sleepMs: 120 });
  if (status >= 400 || text.length < 800) {
    return { ...hit, descriptionHtml: null, description_error: "fetch_failed" };
  }
  const descriptionHtml = parseYerevanMobileDescriptionHtml(text);
  return { ...hit, descriptionHtml, html: text };
}

async function discoverYerevanMobileCatalog({ models = SAMSUNG_PHONE_WHITELIST, log = console.log } = {}) {
  const discovered = [];
  const rejected = [];
  const notFound = [];
  const parserIssues = [];
  const manualReview = [];

  for (const targetModel of models) {
    log(`[ym] ${targetModel}`);
    const result = await searchTargetModel(targetModel);

    if (result.not_found) {
      notFound.push({ model: targetModel, source: "yerevanmobile", reason: "source_not_found" });
      continue;
    }

    if (result.found_but_not_imported) {
      rejected.push({
        model: targetModel,
        source: "yerevanmobile",
        sourceUrl: result.found_but_not_imported.source_url,
        reason: result.found_but_not_imported.reason,
      });
      continue;
    }

    const enriched = await enrichHitWithDescription(result);
    const variants = normalizeYmVariants(enriched);
    if (!variants.length) {
      parserIssues.push({ model: targetModel, source: "yerevanmobile", reason: "no_variants_parsed" });
      continue;
    }

    const hasJsonConfig = /"jsonConfig"\s*:/.test(enriched.html || "");
    const needsMultiVariant = hasJsonConfig && variants.length <= 1;
    if (needsMultiVariant) {
      parserIssues.push({
        model: targetModel,
        source: "yerevanmobile",
        reason: "jsonConfig_present_but_single_variant",
        sourceUrl: enriched.source_url,
      });
      continue;
    }

    if (!enriched.descriptionHtml) {
      manualReview.push({
        model: targetModel,
        source: "yerevanmobile",
        reason: "missing_description_html",
        sourceUrl: enriched.source_url,
      });
    }

    const gallery = variants.flatMap((variant) => variant.gallery || []).slice(0, 12);
    discovered.push({
      source: "yerevanmobile",
      model: targetModel,
      product_name: targetModel,
      product_title: enriched.product_title || targetModel,
      normalized_model: targetModel,
      slug: slugify(targetModel),
      brand: "Samsung",
      category: "Galaxy",
      sourceUrl: enriched.source_url,
      source_urls: [enriched.source_url],
      source_sku: enriched.source_sku,
      price_min: Math.min(...variants.map((variant) => variant.price)),
      price_max: Math.max(...variants.map((variant) => variant.price)),
      gallery,
      descriptionHtml: enriched.descriptionHtml || null,
      variants,
      variant_count: variants.length,
      validation_ok: true,
    });
  }

  return { discovered, rejected, notFound, parserIssues, manualReview };
}

module.exports = { discoverYerevanMobileCatalog, enrichHitWithDescription };
