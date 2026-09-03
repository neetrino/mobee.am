/**
 * Canonical Dyson hair-care color registry.
 * HEX values are palette matches from official Dyson CMF descriptions
 * and classic named-color standards (e.g. Prussian Blue), for swatch UI.
 *
 * Unknown colors must resolve to { status: "manual_review" } — never gray.
 * Palette data: ./dyson-color-entries.json (shared with PDP runtime).
 */

"use strict";

/**
 * @typedef {{
 *   canonicalName: string,
 *   colors: string[],
 *   aliases: string[],
 *   status: "resolved" | "manual_review",
 *   notes?: string,
 * }} DysonColorEntry
 */

/** @type {DysonColorEntry[]} */
const DYSON_COLOR_ENTRIES = require("./dyson-color-entries.json");

/** Truncated / typo tokens that must not resolve without source evidence. */
const AMBIGUOUS_SHORT_TOKENS = new Set([
  "vinca",
  "ceramic",
  "pink",
  "blue",
  "patina",
  "apricot",
  "topaz",
  "nickel",
  "copper",
  "gold",
  "amber",
  "silk",
  "jaspar",
  "jusper",
]);

/**
 * Normalize a color name for lookup (case/separator insensitive).
 * @param {unknown} value
 * @returns {string}
 */
function normalizeColorKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/['’‑–—]/g, "-")
    .replace(/[/_]+/g, " ")
    .replace(/[^a-z0-9\s+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ALIAS_INDEX = new Map();
for (const entry of DYSON_COLOR_ENTRIES) {
  const keys = new Set([normalizeColorKey(entry.canonicalName), ...entry.aliases.map(normalizeColorKey)]);
  for (const key of keys) {
    if (!key) continue;
    if (ALIAS_INDEX.has(key) && ALIAS_INDEX.get(key).canonicalName !== entry.canonicalName) {
      throw new Error(
        `Dyson color alias conflict: "${key}" → ${ALIAS_INDEX.get(key).canonicalName} vs ${entry.canonicalName}`,
      );
    }
    ALIAS_INDEX.set(key, entry);
  }
}

/**
 * @param {unknown} raw
 * @returns {{ status: "resolved", entry: DysonColorEntry } | { status: "manual_review", reason: string, raw: string } | { status: "empty" }}
 */
function resolveDysonColor(raw) {
  if (raw == null) return { status: "empty" };
  const text = Array.isArray(raw) ? String(raw[0] || "") : String(raw);
  if (!text.trim()) return { status: "empty" };

  const key = normalizeColorKey(text);
  if (!key) return { status: "empty" };

  if (AMBIGUOUS_SHORT_TOKENS.has(key)) {
    return {
      status: "manual_review",
      reason: "ambiguous_short_token_needs_source_evidence",
      raw: text.trim(),
    };
  }

  const entry = ALIAS_INDEX.get(key);
  if (!entry) {
    return { status: "manual_review", reason: "unknown_dyson_color", raw: text.trim() };
  }
  if (entry.status !== "resolved" || !entry.colors?.length) {
    return { status: "manual_review", reason: "registry_entry_unresolved", raw: text.trim() };
  }
  if (entry.colors.some((hex) => normalizeColorKey(hex) === "cccccc" || hex.toUpperCase() === "#CCCCCC")) {
    return { status: "manual_review", reason: "gray_hex_forbidden", raw: text.trim() };
  }
  return { status: "resolved", entry };
}

/**
 * Recover a full color from SKU / URL / media alt when attributes are truncated.
 * Only returns a result when evidence is unambiguous.
 *
 * @param {{
 *   rawColor?: unknown,
 *   sku?: string | null,
 *   sourceUrl?: string | null,
 *   mediaAlt?: string | null,
 *   title?: string | null,
 * }} evidence
 * @returns {{ status: "resolved", entry: DysonColorEntry, recoveredFrom: string } | { status: "manual_review", reason: string, raw: string } | { status: "empty" }}
 */
function recoverDysonColorFromEvidence(evidence) {
  const haystack = [
    evidence.rawColor,
    evidence.sku,
    evidence.sourceUrl,
    evidence.mediaAlt,
    evidence.title,
  ]
    .filter(Boolean)
    .join(" ");

  if (!haystack.trim()) return { status: "empty" };

  const candidates = [...DYSON_COLOR_ENTRIES].sort(
    (a, b) => b.canonicalName.length - a.canonicalName.length,
  );

  /** @type {DysonColorEntry[]} */
  const matches = [];
  for (const entry of candidates) {
    const needles = [entry.canonicalName, ...entry.aliases].map(normalizeColorKey);
    const hay = normalizeColorKey(haystack);
    if (needles.some((n) => n && hay.includes(n))) {
      matches.push(entry);
    }
  }

  // Prefer longer / compound matches; drop parent tokens subsumed by a longer match.
  const unique = [];
  for (const entry of matches) {
    const key = normalizeColorKey(entry.canonicalName);
    const subsumed = unique.some((other) => normalizeColorKey(other.canonicalName).includes(key));
    if (!subsumed) unique.push(entry);
  }

  // Special recoveries for known truncated DB values.
  const rawKey = normalizeColorKey(evidence.rawColor);
  const urlKey = normalizeColorKey(evidence.sourceUrl || "");
  const altKey = normalizeColorKey(evidence.mediaAlt || "");
  const skuKey = normalizeColorKey(evidence.sku || "");

  if (rawKey === "vinca" && (urlKey.includes("vinca blue topaz") || skuKey.includes("vinca blue topaz"))) {
    const entry = ALIAS_INDEX.get(normalizeColorKey("Vinca Blue / Topaz"));
    return { status: "resolved", entry, recoveredFrom: "sku_or_url_vinca_blue_topaz" };
  }
  if (rawKey === "ceramic" && (altKey.includes("ceramic pink") || urlKey.includes("ceramic pink"))) {
    const entry = ALIAS_INDEX.get(normalizeColorKey("Ceramic Pink"));
    return { status: "resolved", entry, recoveredFrom: "url_or_alt_ceramic_pink" };
  }
  if (rawKey === "ceramic" && (altKey.includes("ceramic patina") || urlKey.includes("ceramic patina"))) {
    const entry = ALIAS_INDEX.get(normalizeColorKey("Ceramic Patina"));
    return { status: "resolved", entry, recoveredFrom: "url_or_alt_ceramic_patina" };
  }
  if (rawKey === "pink" && (altKey.includes("kanzan pink") || urlKey.includes("kanzan pink"))) {
    const entry = ALIAS_INDEX.get(normalizeColorKey("Kanzan Pink"));
    return { status: "resolved", entry, recoveredFrom: "url_or_alt_kanzan_pink" };
  }
  if (
    (!rawKey || rawKey === "jusper" || rawKey === "jusper plum") &&
    (skuKey.includes("jusper plum") || urlKey.includes("jusper plum") || urlKey.includes("jasper plum"))
  ) {
    const entry = ALIAS_INDEX.get(normalizeColorKey("Jasper Plum"));
    return { status: "resolved", entry, recoveredFrom: "sku_or_url_jasper_plum" };
  }
  if (
    (!evidence.rawColor || !String(evidence.rawColor).trim()) &&
    (urlKey.includes("sg my hk") || skuKey.includes("sg my hk") || urlKey.includes("sg_my_hk"))
  ) {
    const entry = ALIAS_INDEX.get(normalizeColorKey("Ceramic Pink / Rose Gold"));
    return { status: "resolved", entry, recoveredFrom: "url_sg_my_hk_edition" };
  }

  const direct = resolveDysonColor(evidence.rawColor);
  if (direct.status === "resolved") {
    return { ...direct, recoveredFrom: "attributes.color" };
  }

  if (unique.length === 1) {
    return { status: "resolved", entry: unique[0], recoveredFrom: "source_evidence" };
  }
  if (unique.length > 1) {
    return {
      status: "manual_review",
      reason: `multiple_compatible_matches:${unique.map((e) => e.canonicalName).join("|")}`,
      raw: String(evidence.rawColor || "").trim() || "(empty)",
    };
  }

  if (direct.status === "manual_review") return direct;
  return { status: "empty" };
}

function listDysonColorRegistry() {
  return DYSON_COLOR_ENTRIES.map((entry) => ({
    canonicalName: entry.canonicalName,
    aliases: entry.aliases,
    primaryHex: entry.colors[0] || null,
    secondaryHex: entry.colors[1] || null,
    status: entry.status,
    notes: entry.notes || null,
  }));
}

module.exports = {
  DYSON_COLOR_ENTRIES,
  normalizeColorKey,
  resolveDysonColor,
  recoverDysonColorFromEvidence,
  listDysonColorRegistry,
  AMBIGUOUS_SHORT_TOKENS,
};
