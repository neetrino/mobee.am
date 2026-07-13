"use strict";

const {
  DYSON_HAIR_DRYER_PARENT_MODELS,
  PLAYSTATION_CONSOLE_PARENT_MODELS,
  DYSON_HARD_REJECT_KEYWORDS,
  PLAYSTATION_HARD_REJECT_KEYWORDS,
  DYSON_HAIR_DRYER_HINTS,
  PLAYSTATION_GAME_PATTERNS,
  PLAYSTATION_ACCESSORY_PATTERNS,
  PLAYSTATION_MIN_PRICE_AMD,
  DYSON_MIN_PRICE_AMD,
} = require("./targets.cjs");

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

function haystack(name, model = "", url = "") {
  return normalize(`${name || ""} ${model || ""} ${url || ""}`);
}

function containsKeyword(text, keywords) {
  return keywords.some((keyword) => {
    const k = normalize(keyword);
    if (!k) return false;
    return text.includes(k);
  });
}

function isDysonHardRejected(name, model = "", url = "") {
  const text = haystack(name, model, url);
  if (!/\bdyson\b/.test(text)) return false;
  return containsKeyword(text, DYSON_HARD_REJECT_KEYWORDS);
}

function isPlayStationHardRejected(name, model = "", url = "") {
  const text = haystack(name, model, url);
  const isPs = /\b(playstation|ps4|ps5|sony)\b/.test(text);
  if (!isPs) return false;
  return containsKeyword(text, PLAYSTATION_HARD_REJECT_KEYWORDS);
}

function isHairDryerProduct(name, model = "", url = "") {
  const text = haystack(name, model, url);
  if (!/\bdyson\b/.test(text)) return false;
  if (isDysonHardRejected(name, model, url)) return false;
  if (containsKeyword(text, DYSON_HAIR_DRYER_HINTS)) return true;
  if (/\bsupersonic\b/.test(text) && !/\bairwrap\b/.test(text) && !/\bairstrait\b/.test(text)) {
    return true;
  }
  return false;
}

function isPlayStationConsoleBundle(name, model = "", url = "") {
  const text = haystack(name, model, url);
  const isPs = /\b(ps\s*[45]|playstation\s*[45])\b/.test(text);
  if (!isPs) return false;
  const hasConsoleSignal = /\b(slim|digital|pro|console|\d+\s*(gb|tb))\b/.test(text);
  const hasGameAddon =
    PLAYSTATION_GAME_PATTERNS.some((pattern) => pattern.test(text)) ||
    /\+/.test(name || "") ||
    /\bbundle\b/i.test(text);
  return hasConsoleSignal && hasGameAddon;
}

function isPlayStationGame(name, model = "", url = "") {
  if (isPlayStationConsoleBundle(name, model, url)) return false;
  const text = haystack(name, model, url);
  if (!PLAYSTATION_GAME_PATTERNS.some((pattern) => pattern.test(text))) return false;
  if (/\bconsole bundle\b|\bbundle.*console\b|\bконсоль.*bundle\b|\bbundle.*\bконсоль\b/i.test(text)) {
    return false;
  }
  return true;
}

function isPlayStationAccessoryProduct(name, model = "", url = "") {
  const text = haystack(name, model, url);
  return PLAYSTATION_ACCESSORY_PATTERNS.some((pattern) => pattern.test(text));
}

function isPlayStationConsoleProduct(name, model = "", url = "") {
  const text = haystack(name, model, url);
  if (!/\b(playstation|ps\s*[45]|ps4|ps5)\b/.test(text)) return false;
  if (isPlayStationHardRejected(name, model, url)) return false;
  if (isPlayStationGame(name, model, url)) return false;
  if (isPlayStationAccessoryProduct(name, model, url)) return false;
  if (isPlayStationConsoleBundle(name, model, url)) return true;
  if (/\bconsole\b/.test(text)) return true;
  if (/\bplaystation\s*[45]\b/.test(text) && /\b(slim|pro|digital|\d+\s*(gb|tb))\b/.test(text)) {
    return true;
  }
  if (/\bps\s*[45]\b/.test(text) && /\b(slim|pro|digital|\d+\s*(gb|tb))\b/.test(text)) {
    return true;
  }
  return false;
}

function normalizeDysonParentModel(name, model = "", url = "") {
  const text = haystack(name, model, url);
  if (!/\bdyson\b/.test(text)) return null;
  if (isDysonHardRejected(name, model, url)) return null;
  if (!isHairDryerProduct(name, model, url)) return null;

  if (/\bsupersonic\s+travel\b/.test(text) || /\btravel\s+.*supersonic\b/.test(text)) {
    return "Dyson Supersonic Travel";
  }
  if (/\bsupersonic\s+nural\b/.test(text) || /\bnural\b/.test(text) || /\bhd16\b/.test(text)) {
    return "Dyson Supersonic Nural";
  }
  if (/\bsupersonic\s+r\b/.test(text) || /\bsupersonic-r\b/.test(text) || /\bhd17\b/.test(text)) {
    return "Dyson Supersonic r";
  }
  if (/\bsupersonic\b/.test(text)) {
    return "Dyson Supersonic";
  }
  return null;
}

function normalizePlayStationParentModel(name, model = "", url = "") {
  const text = haystack(name, model, url);
  if (!/\b(playstation|ps4|ps5)\b/.test(text)) return null;
  if (isPlayStationHardRejected(name, model, url)) return null;
  if (!isPlayStationConsoleProduct(name, model, url)) return null;

  const isPs5 = /\bps\s*5\b|\bplaystation\s*5\b/.test(text);
  const isPs4 = /\bps\s*4\b|\bplaystation\s*4\b/.test(text);

  if (isPs5) {
    if (/\bpro\b/.test(text)) return "Sony PlayStation 5 Pro";
    if (/\bslim\b/.test(text) && /\bdigital\b/.test(text)) return "Sony PlayStation 5 Slim Digital Edition";
    if (/\bslim\b/.test(text)) return "Sony PlayStation 5 Slim";
    if (/\bdigital\b/.test(text)) return "Sony PlayStation 5 Digital Edition";
    return "Sony PlayStation 5";
  }

  if (isPs4) {
    if (/\bpro\b/.test(text)) return "Sony PlayStation 4 Pro";
    if (/\bslim\b/.test(text)) return "Sony PlayStation 4 Slim";
    return "Sony PlayStation 4";
  }

  return null;
}

function parentModelKey(name, model = "", url = "") {
  return (
    normalizeDysonParentModel(name, model, url) ||
    normalizePlayStationParentModel(name, model, url) ||
    cleanText(name)
  );
}

function detectProductType(name, model = "", url = "") {
  if (normalizeDysonParentModel(name, model, url)) return "dyson";
  if (normalizePlayStationParentModel(name, model, url)) return "playstation";
  return null;
}

function matchesTarget(targetModel, candidateName, sourceUrl = "") {
  const normalized = parentModelKey(candidateName, candidateName, sourceUrl);
  if (normalize(normalized) !== normalize(targetModel)) {
    return { ok: false, reason: "wrong_parent_model", normalized };
  }

  const type = detectProductType(candidateName, candidateName, sourceUrl);
  if (targetModel.startsWith("Dyson")) {
    if (type !== "dyson") return { ok: false, reason: "not_dyson_hair_dryer" };
    if (!DYSON_HAIR_DRYER_PARENT_MODELS.includes(normalized)) {
      return { ok: false, reason: "dyson_not_in_allowlist" };
    }
    if (isDysonHardRejected(candidateName, candidateName, sourceUrl)) {
      return { ok: false, reason: "dyson_hard_reject" };
    }
    if (!isHairDryerProduct(candidateName, candidateName, sourceUrl)) {
      return { ok: false, reason: "not_hair_dryer" };
    }
  }

  if (targetModel.startsWith("Sony PlayStation")) {
    if (type !== "playstation") return { ok: false, reason: "not_playstation_console" };
    if (!PLAYSTATION_CONSOLE_PARENT_MODELS.includes(normalized)) {
      return { ok: false, reason: "playstation_not_in_allowlist" };
    }
    if (isPlayStationHardRejected(candidateName, candidateName, sourceUrl)) {
      return { ok: false, reason: "playstation_hard_reject" };
    }
    if (!isPlayStationConsoleProduct(candidateName, candidateName, sourceUrl)) {
      return { ok: false, reason: "not_console" };
    }
  }

  return { ok: true, normalized, type };
}

function extractStorage(text) {
  const match = normalize(text).match(/\b(\d+(?:\.\d+)?)\s*(tb|gb)\b/);
  if (!match) return null;
  return `${match[1]}${match[2].toUpperCase()}`;
}

function extractEdition(text) {
  const n = normalize(text);
  if (/\bdigital\b/.test(n)) return "Digital";
  if (/\bdisc\b/.test(n) || /\bblu-?ray\b/.test(n)) return "Disc";
  return null;
}

function extractVariantOptions(name, parentModel) {
  const options = {};
  const text = cleanText(name);

  if (parentModel.startsWith("Sony PlayStation")) {
    const storage = extractStorage(text);
    if (storage) options.storage = storage;
    const edition = extractEdition(text);
    if (edition) options.edition = edition;
    if (/\bbundle\b/i.test(text)) options.bundle = "Console Bundle";
    if (PLAYSTATION_GAME_PATTERNS.some((pattern) => pattern.test(text))) {
      options.bundle = options.bundle || "Console Bundle";
    }
  }

  if (parentModel.startsWith("Dyson")) {
    const colorMatch = text.match(/\b(black|white|blue|red|pink|gold|silver|nickel|copper|fuchsia|ceramic|prussian|strawberry|vinca|jasper|topaz|amber|sapphire|platinum|rose|purple|green|yellow|orange|grey|gray)\b/i);
    if (colorMatch) options.color = colorMatch[1];
    const codeMatch = text.match(/\b(HD\d{2,3}[A-Z]?|HD\d{2,3}-[A-Z0-9]+)\b/i);
    if (codeMatch) options.model_code = codeMatch[1].toUpperCase();
  }

  return options;
}

function variantDedupeKey(variant) {
  const options = variant.options || {};
  return [
    normalize(variant.normalized_model || variant.model || variant.name),
    normalize(options.storage || ""),
    normalize(options.edition || ""),
    normalize(options.color || ""),
    normalize(options.model_code || ""),
    normalize(options.bundle || ""),
    normalize(options.source_sku || ""),
    String(variant.source_pid || variant.sourcePid || ""),
    normalize(variant.source || ""),
  ]
    .filter(Boolean)
    .join("|");
}

function minPriceForParentModel(parentModel) {
  if (parentModel.startsWith("Dyson")) return DYSON_MIN_PRICE_AMD;
  return PLAYSTATION_MIN_PRICE_AMD[parentModel] || 150000;
}

function validateVariantForImport(variant) {
  const name = variant.name || "";
  const model = variant.normalized_model || variant.model || parentModelKey(name, name, variant.source_url);
  const target = variant.target_model || model;

  const match = matchesTarget(target, name, variant.source_url || "");
  if (!match.ok) return { ok: false, reason: match.reason, normalized: match.normalized };

  if (isPlayStationGame(name, model, variant.source_url || "")) {
    return { ok: false, reason: "playstation_game_not_console" };
  }
  if (isPlayStationAccessoryProduct(name, model, variant.source_url || "")) {
    return { ok: false, reason: "playstation_accessory_not_console" };
  }

  if (!variant.source_url) return { ok: false, reason: "missing_source_url" };
  if (!variant.image_url && !(variant.gallery && variant.gallery.length)) {
    return { ok: false, reason: "missing_image" };
  }
  if (!variant.price || Number(variant.price) <= 0) {
    return { ok: false, reason: "missing_price" };
  }

  const minPrice = minPriceForParentModel(match.normalized);
  if (Number(variant.price) < minPrice) {
    return { ok: false, reason: `price_below_min_${minPrice}` };
  }

  return { ok: true, normalized: match.normalized, type: match.type };
}

module.exports = {
  cleanText,
  normalize,
  slugify,
  haystack,
  parentModelKey,
  detectProductType,
  matchesTarget,
  normalizeDysonParentModel,
  normalizePlayStationParentModel,
  isDysonHardRejected,
  isPlayStationHardRejected,
  isHairDryerProduct,
  isPlayStationConsoleProduct,
  isPlayStationGame,
  isPlayStationAccessoryProduct,
  isPlayStationConsoleBundle,
  minPriceForParentModel,
  extractVariantOptions,
  variantDedupeKey,
  validateVariantForImport,
};
