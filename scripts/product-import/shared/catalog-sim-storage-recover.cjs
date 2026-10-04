/**
 * Recover SIM / storage labels from media alt / title evidence.
 * Used only to write ProductVariantOption — not a storefront source of truth.
 */

"use strict";

const { normalizeSimLabel } = require("./catalog-sim-attribute-sync.cjs");
const { normalizeStorageLabel } = require("./catalog-storage-attribute-sync.cjs");

/**
 * @param {unknown} media
 * @returns {string[]}
 */
function firstMediaAlts(media) {
  if (!Array.isArray(media)) return [];
  const alts = [];
  for (const item of media) {
    if (item && typeof item === "object" && typeof item.alt === "string" && item.alt.trim()) {
      alts.push(item.alt.trim());
    }
  }
  return alts;
}

/**
 * @param {string} text
 * @returns {{ sim: string | null, storage: string | null }}
 */
function recoverSimStorageFromText(text) {
  if (!text || typeof text !== "string") {
    return { sim: null, storage: null };
  }

  const storageMatch = text.match(/\b(\d+)\s*(GB|TB|MB)\b/i);
  const storage = storageMatch
    ? normalizeStorageLabel(`${storageMatch[1]}${storageMatch[2]}`)
    : null;

  let sim = null;
  if (/\bnano[-\s]?sim\s*(?:&|and|\+)\s*esim\b/i.test(text) || /\bsim\s*\+\s*esim\b/i.test(text)) {
    sim = "Nano-SIM & eSIM";
  } else if (/\bdual\s*esim\b/i.test(text) || /\b2\s*esim\b/i.test(text)) {
    sim = "Dual eSIM";
  } else if (/\bnano[-\s]?sim\b/i.test(text)) {
    sim = "Nano-SIM";
  } else if (/\bdual\s*sim\b/i.test(text)) {
    sim = "Dual SIM";
  } else if (/\besim\b/i.test(text)) {
    sim = "eSIM";
  }

  return {
    sim: normalizeSimLabel(sim),
    storage,
  };
}

/**
 * @param {{
 *   attributes?: unknown,
 *   media?: unknown,
 *   name?: string | null,
 * }} args
 * @returns {{ sim: string | null, storage: string | null }}
 */
function recoverSimStorageFromEvidence(args) {
  const texts = [
    ...firstMediaAlts(args.media),
    typeof args.name === "string" ? args.name : null,
  ].filter(Boolean);

  let sim = null;
  let storage = null;
  for (const text of texts) {
    const recovered = recoverSimStorageFromText(text);
    if (!sim && recovered.sim) sim = recovered.sim;
    if (!storage && recovered.storage) storage = recovered.storage;
    if (sim && storage) break;
  }
  return { sim, storage };
}

module.exports = {
  firstMediaAlts,
  recoverSimStorageFromText,
  recoverSimStorageFromEvidence,
};
