"use strict";

function cleanText(value) {
  return String(value || "")
    .replace(/\u200b/g, "")
    .replace(/\xa0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[''‑–—]/g, "-")
    .replace(/[^\w\s./+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return normalize(value)
    .replace(/\s*\+\s*/g, "-plus")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function variantDedupeKey(variant) {
  const options = variant.options || {};
  return [
    normalize(variant.model || variant.normalized_model || variant.name),
    normalize(options.storage || ""),
    normalize(options.ram || options.memory || ""),
    normalize(options.color || ""),
    normalize(options.connectivity || ""),
    normalize(options.source_sku || ""),
    String(variant.source_pid || variant.sourcePid || ""),
  ]
    .filter(Boolean)
    .join("|");
}

module.exports = {
  cleanText,
  normalize,
  slugify,
  variantDedupeKey,
};
