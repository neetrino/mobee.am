"use strict";

const { parentModelKey, variantDedupeKey, cleanText, normalize } = require("./normalize.cjs");

const SOURCE_PRIORITY = { mobilecentre: 2, yerevanmobile: 1 };

function uniqueList(arr) {
  const out = [];
  const seen = new Set();
  for (const value of arr) {
    const key = String(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function pickPrimaryVariant(variants) {
  return [...variants].sort((a, b) => (SOURCE_PRIORITY[b.source] || 0) - (SOURCE_PRIORITY[a.source] || 0))[0];
}

function mergeVariant(existing, incoming) {
  const keep = (SOURCE_PRIORITY[incoming.source] || 0) >= (SOURCE_PRIORITY[existing.source] || 0) ? incoming : existing;
  const other = keep === incoming ? existing : incoming;
  return {
    ...other,
    ...keep,
    source_urls: uniqueList([
      ...(existing.source_urls || [existing.source_url]),
      ...(incoming.source_urls || [incoming.source_url]),
    ]),
    gallery: uniqueList([...(keep.gallery || []), ...(other.gallery || [])]),
    gallery_by_color: { ...(other.gallery_by_color || {}), ...(keep.gallery_by_color || {}) },
    sources: uniqueList([...(existing.sources || [existing.source]), incoming.source]),
  };
}

function buildVariableProducts(flatVariants) {
  const byParent = new Map();

  for (const variant of flatVariants) {
    const parent = variant.normalized_model || parentModelKey(variant.name, variant.model, variant.source_url);
    const target = variant.target_model;
    if (!parent || !target) continue;
    if (normalize(parentModelKey(target)) !== normalize(parent)) continue;
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent).push({ ...variant, normalized_model: parent, target_model: target });
  }

  const products = [];

  for (const [parentModel, variants] of byParent.entries()) {
    const dedupedMap = new Map();
    for (const variant of variants) {
      const key = variantDedupeKey(variant);
      if (dedupedMap.has(key)) dedupedMap.set(key, mergeVariant(dedupedMap.get(key), variant));
      else {
        dedupedMap.set(key, {
          ...variant,
          source_urls: [variant.source_url],
          sources: [variant.source],
        });
      }
    }

    const deduped = [...dedupedMap.values()];
    if (!deduped.length) continue;

    const primary = pickPrimaryVariant(deduped);
    const optionValues = {};
    const galleryByColor = {};
    let minPrice = null;
    let maxPrice = null;

    for (const variant of deduped) {
      for (const [key, value] of Object.entries(variant.options || {})) {
        if (!value) continue;
        if (!optionValues[key]) optionValues[key] = [];
        optionValues[key].push(value);
      }
      const color = variant.options?.color;
      if (color) galleryByColor[color] = uniqueList([...(galleryByColor[color] || []), ...(variant.gallery || [])]);
      if (typeof variant.price === "number") {
        minPrice = minPrice == null ? variant.price : Math.min(minPrice, variant.price);
        maxPrice = maxPrice == null ? variant.price : Math.max(maxPrice, variant.price);
      }
    }

    const target = variants.find((row) => row.target_model)?.target_model || parentModel;
    const productType = primary.product_type || (parentModel.startsWith("Dyson") ? "dyson" : "playstation");

    products.push({
      target_model: target,
      normalized_model: parentModel,
      product_name: cleanText(primary.name.split(",")[0]) || parentModel,
      product_type: productType,
      category: primary.category || (productType === "dyson" ? "Hair Dryers" : "Game Consoles"),
      currency: primary.currency || "AMD",
      price_min: minPrice,
      price_max: maxPrice,
      primary_source: primary.source,
      source_urls: uniqueList(deduped.flatMap((row) => row.source_urls || [row.source_url])),
      available_options: Object.fromEntries(
        Object.entries(optionValues).map(([key, values]) => [key, uniqueList(values).sort()]),
      ),
      gallery: uniqueList(deduped.flatMap((row) => row.gallery || [])),
      gallery_by_color: galleryByColor,
      description: primary.description || "",
      descriptionHtml: primary.descriptionHtml || null,
      specifications: primary.specifications || primary.description || "",
      variants: deduped.map((row) => ({ ...row, gallery: row.gallery || [] })),
      variant_count: deduped.length,
    });
  }

  products.sort((a, b) => a.normalized_model.localeCompare(b.normalized_model));
  return products;
}

module.exports = { buildVariableProducts, mergeVariant, pickPrimaryVariant };
