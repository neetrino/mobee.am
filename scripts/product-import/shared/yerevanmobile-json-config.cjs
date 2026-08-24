"use strict";

const { normalizeVariantOptions } = require("./samsung-attribute-normalize.cjs");

const MIN_PHONE_PRICE_AMD = 50000;

const YM_OPTION_KEY_ALIASES = {
  color: "color",
  colour: "color",
  memory: "storage",
  gb_ram: "ram",
  ram: "ram",
  size: "size",
  connectivity: "connectivity",
  sim: "sim",
};

function extractJsonConfig(html) {
  const match = html.match(/"jsonConfig"\s*:\s*(\{[\s\S]*?\})\s*,\s*"jsonSwatchConfig"/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function resolveOptionLabel(attr, optionId) {
  for (const opt of Object.values(attr.options || {})) {
    if (String(opt.id) === String(optionId)) return opt.label;
  }
  return null;
}

function normalizeYmImportOptions(rawOptions) {
  const mapped = {};
  for (const [key, value] of Object.entries(rawOptions || {})) {
    if (!value) continue;
    const target = YM_OPTION_KEY_ALIASES[key] || key;
    mapped[target] = String(value).trim();
  }
  return normalizeVariantOptions(mapped);
}

function decodeJsonConfigVariantOptions(attributes, indexEntry) {
  const options = {};
  for (const [attrId, optionId] of Object.entries(indexEntry || {})) {
    const attr = attributes?.[attrId];
    if (!attr) continue;
    const label = resolveOptionLabel(attr, optionId);
    if (!label) continue;
    const code = attr.code || attr.label?.toLowerCase?.() || String(attrId);
    options[code] = label;
  }
  return normalizeYmImportOptions(options);
}

function resolveJsonConfigImageEntry(imageEntry) {
  if (!imageEntry) return null;
  const record = Array.isArray(imageEntry) ? imageEntry[0] : imageEntry;
  if (!record || typeof record !== "object") return null;
  return record.full || record.img || record.thumb || null;
}

function parseJsonConfigVariants(html, baseTitle, url, pageSku) {
  const cfg = extractJsonConfig(html);
  if (!cfg?.index || !cfg.attributes) return [];

  const slug = url.split("/").pop()?.replace(".html", "") || "product";
  const variants = [];

  for (const [childId, indexEntry] of Object.entries(cfg.index)) {
    const price = cfg.optionPrices?.[childId]?.finalPrice?.amount;
    if (!Number.isFinite(price) || price < MIN_PHONE_PRICE_AMD) continue;

    const options = decodeJsonConfigVariantOptions(cfg.attributes, indexEntry);
    const color = options.color || "";
    const storage = options.storage || "";
    const labelParts = [color, storage].filter(Boolean);
    const suffix = labelParts.length ? ` (${labelParts.join(", ")})` : "";
    const imageUrl = resolveJsonConfigImageEntry(cfg.images?.[childId]);

    variants.push({
      name: `${baseTitle}${suffix}`,
      options,
      price,
      source_pid: `${slug}-${childId}`,
      sku: pageSku ? `ym-${pageSku}-${childId}` : `ym-${slug}-${childId}`,
      image_url: imageUrl,
      gallery: imageUrl ? [imageUrl] : [],
    });
  }

  return variants;
}

function parseJsonConfigImages(html) {
  const cfg = extractJsonConfig(html);
  if (!cfg?.images) return new Map();

  const images = new Map();
  for (const [childId, entry] of Object.entries(cfg.images)) {
    const url = resolveJsonConfigImageEntry(entry);
    if (url) images.set(String(childId), url);
  }
  return images;
}

module.exports = {
  YM_OPTION_KEY_ALIASES,
  extractJsonConfig,
  normalizeYmImportOptions,
  decodeJsonConfigVariantOptions,
  parseJsonConfigVariants,
  parseJsonConfigImages,
};
