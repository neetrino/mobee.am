/**
 * Recover a catalog color name from JSONB attributes, variant name, or media alt.
 * Used only to write ProductVariantOption — not a storefront source of truth.
 */

"use strict";

const { compactColorKey } = require("./catalog-color-hex.cjs");

const TRAILING_PAREN_COLOR = /\(([^)]+)\)\s*$/;
const NOT_COLOR_PAREN = /^(?:\d+\s*(?:GB|TB)|4G|5G|LTE|eSIM|Wi-?Fi)$/i;
const REJECT_EXACT = new Set([
  "eu",
  "us",
  "uk",
  "lte",
  "wifi",
  "dyson",
  "apple",
  "samsung",
  "google",
  "sony",
]);
const MODEL_OR_SKU = /^(?:[A-Z]{1,4}-)\d|[A-Z]{2}-\d|^[A-Z0-9-]{10,}$/i;

function isPlausibleCatalogColorName(value) {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed || trimmed.length > 48) return false;
  if (NOT_COLOR_PAREN.test(trimmed)) return false;
  if (/^[A-Z]{2,3}$/.test(trimmed)) return false;
  if (REJECT_EXACT.has(compactColorKey(trimmed))) return false;
  if (MODEL_OR_SKU.test(trimmed)) return false;
  if (!/[a-zA-Z]/.test(trimmed)) return false;
  return true;
}

function extractColorFromTrailingParentheses(text) {
  if (!text || typeof text !== "string") return null;
  const match = text.trim().match(TRAILING_PAREN_COLOR);
  if (!match) return null;
  const value = match[1].replace(/\s+/g, " ").trim();
  if (!isPlausibleCatalogColorName(value)) return null;
  return value;
}

function pickRawColorFromAttributes(attributes) {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
    return null;
  }
  const raw = attributes.color ?? attributes.Colour ?? attributes.colour;
  if (typeof raw === "string" && isPlausibleCatalogColorName(raw.trim())) {
    return raw.trim();
  }
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const first = raw[0];
  if (typeof first === "string" && isPlausibleCatalogColorName(first.trim())) {
    return first.trim();
  }
  if (first && typeof first === "object" && first.value) {
    const value = String(first.value).trim();
    return isPlausibleCatalogColorName(value) ? value : null;
  }
  return null;
}

function firstMediaAlts(media) {
  if (!Array.isArray(media)) return [];
  const alts = [];
  for (const item of media) {
    if (item && typeof item === "object" && typeof item.alt === "string") {
      alts.push(item.alt);
    }
  }
  return alts;
}

/**
 * @param {{
 *   attributes?: unknown,
 *   media?: unknown,
 *   name?: string | null,
 * }} evidence
 * @returns {string | null}
 */
function recoverCatalogColorFromEvidence(evidence) {
  const fromAttrs = pickRawColorFromAttributes(evidence?.attributes);
  if (fromAttrs) return fromAttrs;

  const fromName = extractColorFromTrailingParentheses(evidence?.name);
  if (fromName) return fromName;

  for (const alt of firstMediaAlts(evidence?.media)) {
    const fromAlt = extractColorFromTrailingParentheses(alt);
    if (fromAlt) return fromAlt;
  }

  return null;
}

module.exports = {
  extractColorFromTrailingParentheses,
  pickRawColorFromAttributes,
  recoverCatalogColorFromEvidence,
  isPlausibleCatalogColorName,
};
