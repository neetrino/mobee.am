"use strict";

const { SAMSUNG_PHONE_WHITELIST } = require("./whitelist.constants.cjs");

/** @typedef {{ model: string|null, reason: string|null }} WhitelistMatch */

const WHITELIST_RULES = [
  [/(?:samsung\s+)?galaxy\s+s25\s+ultra\b/i, "Samsung Galaxy S25 Ultra"],
  [/(?:samsung\s+)?galaxy\s+s25\s+edge\b/i, "Samsung Galaxy S25 Edge"],
  [/(?:samsung\s+)?galaxy\s+s25\s+fe\b/i, "Samsung Galaxy S25 FE"],
  [/(?:samsung\s+)?galaxy\s+s25\s*\+/i, "Samsung Galaxy S25+"],
  [/(?:samsung\s+)?galaxy\s+s25\b(?!\s*\+|\s*ultra|\s*edge|\s*fe\b)/i, "Samsung Galaxy S25"],
  [/(?:samsung\s+)?galaxy\s+s26\s+ultra\b/i, "Samsung Galaxy S26 Ultra"],
  [/(?:samsung\s+)?galaxy\s+s26\s*\+/i, "Samsung Galaxy S26+"],
  [/(?:samsung\s+)?galaxy\s+s26\b(?!\s*\+|\s*ultra\b)/i, "Samsung Galaxy S26"],
  [/(?:samsung\s+)?galaxy\s+a56\s+5g\b/i, "Samsung Galaxy A56 5G"],
  [/(?:samsung\s+)?galaxy\s+a36\s+5g\b/i, "Samsung Galaxy A36 5G"],
  [/(?:samsung\s+)?galaxy\s+a26\s+5g\b/i, "Samsung Galaxy A26 5G"],
  [/(?:samsung\s+)?galaxy\s+a17\s+5g\b/i, "Samsung Galaxy A17 5G"],
  [/(?:samsung\s+)?galaxy\s+a16\s+5g\b/i, "Samsung Galaxy A16 5G"],
  [/(?:samsung\s+)?galaxy\s+a06\s+5g\b/i, "Samsung Galaxy A06 5G"],
  [/(?:samsung\s+)?galaxy\s+a57\s+5g\b/i, "Samsung Galaxy A57 5G"],
  [/(?:samsung\s+)?galaxy\s+a37\s+5g\b/i, "Samsung Galaxy A37 5G"],
  [/(?:samsung\s+)?galaxy\s+a27\s+5g\b/i, "Samsung Galaxy A27 5G"],
  [/(?:samsung\s+)?galaxy\s+a07\s+5g\b/i, "Samsung Galaxy A07 5G"],
  [/(?:samsung\s+)?galaxy\s+a56\b(?!\s*5g\b)/i, "Samsung Galaxy A56"],
  [/(?:samsung\s+)?galaxy\s+a36\b(?!\s*5g\b)/i, "Samsung Galaxy A36"],
  [/(?:samsung\s+)?galaxy\s+a26\b(?!\s*5g\b)/i, "Samsung Galaxy A26"],
  [/(?:samsung\s+)?galaxy\s+a17\b(?!\s*5g\b)/i, "Samsung Galaxy A17"],
  [/(?:samsung\s+)?galaxy\s+a16\b(?!\s*5g\b)/i, "Samsung Galaxy A16"],
  [/(?:samsung\s+)?galaxy\s+a06\b(?!\s*5g\b)/i, "Samsung Galaxy A06"],
  [/(?:samsung\s+)?galaxy\s+a57\b(?!\s*5g\b)/i, "Samsung Galaxy A57"],
  [/(?:samsung\s+)?galaxy\s+a37\b(?!\s*5g\b)/i, "Samsung Galaxy A37"],
  [/(?:samsung\s+)?galaxy\s+a27\b(?!\s*5g\b)/i, "Samsung Galaxy A27"],
  [/(?:samsung\s+)?galaxy\s+a07\b(?!\s*5g\b)/i, "Samsung Galaxy A07"],
  [/(?:samsung\s+)?galaxy\s+z\s+flip\s*7\s+fe\b/i, "Samsung Galaxy Z Flip7 FE"],
  [/(?:samsung\s+)?galaxy\s+z\s+trifold\b/i, "Samsung Galaxy Z TriFold"],
  [/(?:samsung\s+)?galaxy\s+z\s+fold\s*7\b/i, "Samsung Galaxy Z Fold7"],
  [/(?:samsung\s+)?galaxy\s+z\s+flip\s*7\b(?!\s*fe\b)/i, "Samsung Galaxy Z Flip7"],
];

const HARD_REJECT_PATTERNS = [
  /(?:samsung\s+)?galaxy\s+s24\s*\+?\b/i,
  /(?:samsung\s+)?galaxy\s+s24\s+ultra\b/i,
  /(?:samsung\s+)?galaxy\s+s24\s+fe\b/i,
  /(?:samsung\s+)?galaxy\s+s23\b/i,
  /(?:samsung\s+)?galaxy\s+s22\b/i,
  /(?:samsung\s+)?galaxy\s+a55\b/i,
  /(?:samsung\s+)?galaxy\s+a35\b/i,
  /(?:samsung\s+)?galaxy\s+a25\b/i,
  /(?:samsung\s+)?galaxy\s+a16\s+5g\b/i,
  /(?:samsung\s+)?galaxy\s+a15\b/i,
  /(?:samsung\s+)?galaxy\s+z\s+fold\s*6\b/i,
  /(?:samsung\s+)?galaxy\s+z\s+flip\s*6\b/i,
  /(?:samsung\s+)?galaxy\s+z\s+fold\s*5\b/i,
  /(?:samsung\s+)?galaxy\s+z\s+flip\s*5\b/i,
  /(?:samsung\s+)?galaxy\s+tab\b/i,
  /(?:samsung\s+)?galaxy\s+watch\b/i,
  /(?:samsung\s+)?galaxy\s+buds\b/i,
];

const ACCESSORY_PATTERNS = [
  /\bcase\s+for\b/i,
  /\bcover\s+for\b/i,
  /\bfor\s+(?:samsung\s+)?galaxy\b/i,
  /\bscreen\s+protector\b/i,
  /\btempered\s+glass\b/i,
  /\bcharger\b/i,
  /\bcable\b/i,
];

const WHITELIST_SET = new Set(SAMSUNG_PHONE_WHITELIST);

function haystack(name, model = "") {
  return `${name || ""} ${model || ""}`.toLowerCase().replace(/\s+/g, " ").trim();
}

function isHardRejected(name, model = "") {
  const text = haystack(name, model);
  return HARD_REJECT_PATTERNS.some((pattern) => pattern.test(text));
}

function isAccessory(name, model = "") {
  const text = haystack(name, model);
  return ACCESSORY_PATTERNS.some((pattern) => pattern.test(text));
}

/** @returns {WhitelistMatch} */
function matchWhitelistModel(name, model = "") {
  const text = haystack(name, model);
  if (!/\b(samsung|galaxy)\b/i.test(text)) {
    return { model: null, reason: "not_samsung" };
  }
  if (isHardRejected(name, model)) {
    return { model: null, reason: "hard_reject" };
  }
  if (isAccessory(name, model)) {
    return { model: null, reason: "accessory" };
  }
  for (const [pattern, label] of WHITELIST_RULES) {
    if (pattern.test(text)) {
      return { model: label, reason: null };
    }
  }
  return { model: null, reason: "not_in_whitelist" };
}

function isWhitelistedParentModel(model) {
  return WHITELIST_SET.has(model);
}

function validateVariantForImport(variant) {
  const name = variant.name || "";
  const model = variant.model || "";
  const match = matchWhitelistModel(name, model);
  if (!match.model) {
    return { ok: false, reason: match.reason || "not_in_whitelist" };
  }
  if (match.model !== model) {
    return { ok: false, reason: "model_mismatch" };
  }
  if (!isWhitelistedParentModel(model)) {
    return { ok: false, reason: "parent_not_whitelisted" };
  }
  if (!variant.product_url) {
    return { ok: false, reason: "missing_source_url" };
  }
  if (!variant.source_pid) {
    return { ok: false, reason: "missing_source_pid" };
  }
  const price = Number(variant.price);
  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, reason: "missing_or_invalid_price" };
  }
  if (!variant.image_url && !(variant.gallery && variant.gallery.length)) {
    return { ok: false, reason: "missing_image" };
  }
  return { ok: true, reason: null, model: match.model };
}

module.exports = {
  SAMSUNG_PHONE_WHITELIST,
  WHITELIST_SET,
  matchWhitelistModel,
  isWhitelistedParentModel,
  isHardRejected,
  isAccessory,
  validateVariantForImport,
};
