"use strict";

const BRAND_PREFIXES = [
  "samsung",
  "bosch",
  "lg",
  "hisense",
  "hisens",
  "midea",
];

/**
 * Strip brand words / marketing fluff from a product title.
 */
function stripBrandNoise(title) {
  let t = String(title || "");
  t = t.replace(/\bTV\s+LED\b/gi, " ");
  t = t.replace(/\bSmart\s+TV\b/gi, " ");
  for (const brand of BRAND_PREFIXES) {
    t = t.replace(new RegExp(`^\\s*${brand}\\b`, "i"), " ");
  }
  return t.replace(/\s+/g, " ").trim();
}

/**
 * Extract likely manufacturer model code from Mobee title.
 */
function extractModelFromTitle(title) {
  const cleaned = stripBrandNoise(title);
  if (!cleaned) return null;

  // Prefer long alphanumeric model codes (e.g. QA75QN85CAUXZN, UE43DU8000UXCE, KGP86FICON).
  const candidates = [];
  const re =
    /\b([A-Z]{1,4}[-]?[A-Z0-9]{2,}(?:[-]?[A-Z0-9]+){0,6})\b/gi;
  let m;
  while ((m = re.exec(cleaned)) !== null) {
    const raw = m[1];
    if (/^\d+(\.\d+)?(kg|կգ)?$/i.test(raw)) continue;
    if (raw.length < 4) continue;
    candidates.push(raw);
  }

  if (candidates.length === 0) {
    // Fallback: first token with digit
    const token = cleaned.split(/\s+/).find((t) => /[A-Za-z]/.test(t) && /\d/.test(t));
    return token ? token.replace(/[^\w.-]/g, "") : null;
  }

  // Prefer the longest candidate (usually full model with regional suffix).
  candidates.sort((a, b) => b.length - a.length || a.localeCompare(b));
  return candidates[0];
}

function normalizeModelKey(model) {
  return String(model || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Compact form for matching: remove spaces, hyphens, dots; uppercase.
 */
function compactModel(model) {
  return String(model || "")
    .toUpperCase()
    .replace(/[\s._-]+/g, "");
}

/**
 * Base model without common regional suffix (last 2–4 letters after digits).
 * e.g. UE43DU8000UXCE → UE43DU8000, F2V5GG2S stays.
 */
function baseModelVariants(model) {
  const compact = compactModel(model);
  const variants = new Set([compact]);
  // Drop trailing regional suffix like UXCE / UXZN / KXXU / UXRU (2–5 letters at end after digits)
  const m = compact.match(/^(.+\d)([A-Z]{2,5})$/);
  if (m) variants.add(m[1]);
  // Also drop middle hyphens already removed
  return [...variants];
}

/**
 * Compare extracted model to page text / URL.
 * @returns {"EXACT_MODEL_MATCH"|"NORMALIZED_MODEL_MATCH"|"NO_MATCH"}
 */
function matchModelOnPage(model, pageUrl, pageText) {
  if (!model) return "NO_MATCH";
  const compact = compactModel(model);
  const hayUrl = compactModel(pageUrl || "");
  const hayText = compactModel(String(pageText || "").slice(0, 200_000));
  const inUrl = hayUrl.includes(compact);
  const inText = hayText.includes(compact);

  // Require model evidence in page body. URL-only matches are often soft 404 /
  // category landings (e.g. Samsung /c/p/{MODEL}/ without a real PDP).
  if (inText) return "EXACT_MODEL_MATCH";

  const compact0 = compact.replace(/O/g, "0");
  const hayText0 = hayText.replace(/O/g, "0");
  if (hayText0.includes(compact0)) return "NORMALIZED_MODEL_MATCH";

  const bases = baseModelVariants(model).filter((b) => b.length >= 6);
  for (const base of bases) {
    if (base === compact) continue;
    if (hayText.includes(base) || hayText0.includes(base.replace(/O/g, "0"))) {
      const suffixRe = new RegExp(`${base}[A-Z0-9]{0,6}`, "i");
      if (suffixRe.test(pageText || "")) {
        return "NORMALIZED_MODEL_MATCH";
      }
    }
  }

  if (inUrl && !inText) return "NO_MATCH";
  return "NO_MATCH";
}

/**
 * Alternate spellings to try when probing official sites (O/0, base model, etc.).
 */
function modelLookupVariants(model) {
  const compact = compactModel(model);
  const variants = new Set([String(model || ""), compact]);
  for (const base of baseModelVariants(model)) variants.add(base);

  // Bosch e-numbers often confuse letter O and digit 0.
  for (const v of [...variants]) {
    if (/O/.test(v)) variants.add(v.replace(/O/g, "0"));
    if (/0/.test(v)) variants.add(v.replace(/0/g, "O"));
  }

  return [...variants].filter((v) => String(v).length >= 4);
}

module.exports = {
  extractModelFromTitle,
  normalizeModelKey,
  compactModel,
  baseModelVariants,
  matchModelOnPage,
  stripBrandNoise,
  modelLookupVariants,
};
