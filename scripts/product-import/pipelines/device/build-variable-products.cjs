"use strict";

const {
  parentModelKey,
  variantDedupeKey,
  cleanText,
  normalize,
  categoryForParentModel,
} = require("./normalize.cjs");

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
  return [...variants].sort((a, b) => {
    const galleryDelta = (b.gallery?.length || 0) - (a.gallery?.length || 0);
    if (galleryDelta !== 0 && (SOURCE_PRIORITY[a.source] || 0) === (SOURCE_PRIORITY[b.source] || 0)) {
      return galleryDelta;
    }
    return (SOURCE_PRIORITY[b.source] || 0) - (SOURCE_PRIORITY[a.source] || 0);
  })[0];
}

function pickBestDescriptionHtml(variants) {
  const ranked = [...variants].sort((a, b) => {
    const lenA = (a.descriptionHtml || "").length;
    const lenB = (b.descriptionHtml || "").length;
    if (lenB !== lenA) return lenB - lenA;
    return (SOURCE_PRIORITY[b.source] || 0) - (SOURCE_PRIORITY[a.source] || 0);
  });
  return ranked.find((row) => row.descriptionHtml)?.descriptionHtml || null;
}

function pickBestDescriptionText(variants) {
  const ranked = [...variants].sort((a, b) => {
    const lenA = (a.description || a.specifications || "").length;
    const lenB = (b.description || b.specifications || "").length;
    if (lenB !== lenA) return lenB - lenA;
    return (SOURCE_PRIORITY[b.source] || 0) - (SOURCE_PRIORITY[a.source] || 0);
  });
  const best = ranked.find((row) => row.description || row.specifications);
  return best?.description || best?.specifications || "";
}

function mergeVariant(existing, incoming) {
  const existingGallery = existing.gallery?.length || 0;
  const incomingGallery = incoming.gallery?.length || 0;
  let keep = existing;
  let other = incoming;

  if ((SOURCE_PRIORITY[incoming.source] || 0) > (SOURCE_PRIORITY[existing.source] || 0)) {
    keep = incoming;
    other = existing;
  } else if (
    (SOURCE_PRIORITY[incoming.source] || 0) === (SOURCE_PRIORITY[existing.source] || 0) &&
    incomingGallery > existingGallery
  ) {
    keep = incoming;
    other = existing;
  } else if (
    existing.source !== "mobilecentre" &&
    incoming.source === "mobilecentre" &&
    incomingGallery >= existingGallery
  ) {
    keep = incoming;
    other = existing;
  }

  const descriptionHtml =
    (keep.descriptionHtml && keep.descriptionHtml.length >= ((other.descriptionHtml || "").length || 0)
      ? keep.descriptionHtml
      : other.descriptionHtml) ||
    keep.descriptionHtml ||
    other.descriptionHtml ||
    null;

  return {
    ...other,
    ...keep,
    description: keep.description || other.description || "",
    descriptionHtml,
    specifications: keep.specifications || other.specifications || keep.description || other.description || "",
    source_urls: uniqueList([
      ...(existing.source_urls || [existing.source_url]),
      ...(incoming.source_urls || [incoming.source_url]),
    ]),
    gallery: uniqueList([...(keep.gallery || []), ...(other.gallery || [])]),
    gallery_by_color: { ...(other.gallery_by_color || {}), ...(keep.gallery_by_color || {}) },
    sources: uniqueList([...(existing.sources || [existing.source]), incoming.source]),
    options: { ...(other.options || {}), ...(keep.options || {}) },
  };
}

/**
 * Merge MC rows lacking hair_type/kit into the unique matching YM color variant
 * when only one filled hair_type exists for that color+model_code.
 */
function softMergeDysonByColor(variants) {
  const groups = new Map();
  for (const variant of variants) {
    const options = variant.options || {};
    const key = [
      normalize(options.model_code || ""),
      normalize(options.color || ""),
    ].join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(variant);
  }

  const out = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      out.push(group[0]);
      continue;
    }
    const filledHair = [
      ...new Set(group.map((row) => row.options?.hair_type).filter(Boolean)),
    ];
    const empties = group.filter((row) => !row.options?.hair_type);
    const filled = group.filter((row) => row.options?.hair_type);

    if (empties.length && filledHair.length === 1 && filled.length) {
      let merged = filled[0];
      for (const extra of filled.slice(1)) merged = mergeVariant(merged, extra);
      for (const empty of empties) merged = mergeVariant(merged, empty);
      out.push(merged);
      continue;
    }

    // No hair_type distinction: merge all same color/model
    if (!filledHair.length) {
      let merged = group[0];
      for (const extra of group.slice(1)) merged = mergeVariant(merged, extra);
      out.push(merged);
      continue;
    }

    // Multiple hair types present: keep each hair_type, fold empty-MC rows into Straight + Wavy when present.
    if (empties.length && filledHair.length > 1) {
      const byHair = new Map();
      for (const row of filled) {
        const hair = row.options.hair_type;
        byHair.set(hair, byHair.has(hair) ? mergeVariant(byHair.get(hair), row) : row);
      }
      const foldTarget =
        byHair.get("Straight + Wavy") || byHair.values().next().value;
      for (const empty of empties) {
        const key = foldTarget.options.hair_type;
        byHair.set(key, mergeVariant(byHair.get(key), empty));
      }
      out.push(...byHair.values());
      continue;
    }

    out.push(...group);
  }
  return out;
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

    let deduped = [...dedupedMap.values()];
    if (parentModel.startsWith("Dyson")) {
      deduped = softMergeDysonByColor(deduped);
    }
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
    const category =
      categoryForParentModel(parentModel) ||
      primary.category ||
      (productType === "dyson" ? "Hair Dryers" : "Game Consoles");

    products.push({
      target_model: target,
      normalized_model: parentModel,
      product_name: cleanText(parentModel) || cleanText(primary.name.split(",")[0]) || parentModel,
      product_type: productType,
      category,
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
      description: pickBestDescriptionText(deduped),
      descriptionHtml: pickBestDescriptionHtml(deduped),
      specifications: pickBestDescriptionText(deduped),
      variants: deduped.map((row) => ({ ...row, gallery: row.gallery || [] })),
      variant_count: deduped.length,
    });
  }

  products.sort((a, b) => a.normalized_model.localeCompare(b.normalized_model));
  return products;
}

module.exports = { buildVariableProducts, mergeVariant, pickPrimaryVariant };
