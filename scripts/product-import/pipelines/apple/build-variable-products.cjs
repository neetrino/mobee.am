"use strict";

const { parentModelKey, variantDedupeKey, cleanText, normalize } = require("./normalize.cjs");

const SOURCE_PRIORITY = { ispace: 3, mobilecentre: 2, yerevanmobile: 1 };

function uniqueList(arr) {
  const out = [];
  const seen = new Set();
  for (const v of arr) {
    const k = String(v);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(v);
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
    source_urls: uniqueList([...(existing.source_urls || [existing.source_url]), ...(incoming.source_urls || [incoming.source_url])]),
    gallery: uniqueList([...(keep.gallery || []), ...(other.gallery || [])]),
    gallery_by_color: { ...(other.gallery_by_color || {}), ...(keep.gallery_by_color || {}) },
    sources: uniqueList([...(existing.sources || [existing.source]), incoming.source]),
  };
}

function buildVariableProducts(flatVariants, targetModels) {
  const byParent = new Map();

  for (const v of flatVariants) {
    const parent = parentModelKey(v.name || v.model || v.normalized_model);
    const target = v.target_model;
    if (!parent || !target) continue;
    if (normalize(parentModelKey(target)) !== normalize(parent)) continue;
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent).push({ ...v, normalized_model: parent, target_model: target });
  }

  const products = [];

  for (const [parentModel, variants] of byParent.entries()) {
    const dedupedMap = new Map();
    for (const v of variants) {
      const key = variantDedupeKey(v);
      if (dedupedMap.has(key)) dedupedMap.set(key, mergeVariant(dedupedMap.get(key), v));
      else dedupedMap.set(key, { ...v, source_urls: [v.source_url], sources: [v.source] });
    }
    const deduped = [...dedupedMap.values()];
    if (!deduped.length) continue;

    const primary = pickPrimaryVariant(deduped);
    const optionValues = {};
    const galleryByColor = {};
    let minPrice = null;
    let maxPrice = null;

    for (const v of deduped) {
      for (const [k, val] of Object.entries(v.options || {})) {
        if (!val) continue;
        if (!optionValues[k]) optionValues[k] = [];
        optionValues[k].push(val);
      }
      const color = v.options?.color;
      if (color) galleryByColor[color] = uniqueList([...(galleryByColor[color] || []), ...(v.gallery || [])]);
      if (typeof v.price === "number") {
        minPrice = minPrice == null ? v.price : Math.min(minPrice, v.price);
        maxPrice = maxPrice == null ? v.price : Math.max(maxPrice, v.price);
      }
    }

    const target = variants.find((x) => x.target_model)?.target_model || parentModel;

    products.push({
      target_model: target,
      normalized_model: parentModel,
      product_name: cleanText(primary.name.split(",")[0]) || parentModel,
      category: primary.category,
      currency: primary.currency || "AMD",
      price_min: minPrice,
      price_max: maxPrice,
      primary_source: primary.source,
      source_urls: uniqueList(deduped.flatMap((v) => v.source_urls || [v.source_url])),
      available_options: Object.fromEntries(
        Object.entries(optionValues).map(([k, vals]) => [k, uniqueList(vals).sort()])
      ),
      gallery: uniqueList(deduped.flatMap((v) => v.gallery || [])),
      gallery_by_color: galleryByColor,
      description: primary.description || "",
      descriptionHtml: primary.descriptionHtml || null,
      specifications: primary.specifications || primary.description || "",
      variants: deduped.map((v) => ({
        ...v,
        gallery: v.gallery || [],
      })),
      variant_count: deduped.length,
    });
  }

  products.sort((a, b) => a.normalized_model.localeCompare(b.normalized_model));
  return products;
}

module.exports = { buildVariableProducts, mergeVariant, pickPrimaryVariant };
