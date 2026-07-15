"use strict";

const {
  DYSON_HAIR_DRYER_PARENT_MODELS,
  DYSON_HAIR_PARENT_MODELS,
  DYSON_CATEGORY_BY_PARENT,
  DYSON_CATEGORY_SLUG_BY_PARENT,
  PLAYSTATION_CONSOLE_PARENT_MODELS,
  DYSON_NON_HAIR_REJECT_KEYWORDS,
  DYSON_ACCESSORY_REJECT_KEYWORDS,
  PLAYSTATION_HARD_REJECT_KEYWORDS,
  DYSON_HAIR_DEVICE_HINTS,
  PLAYSTATION_GAME_PATTERNS,
  PLAYSTATION_ACCESSORY_PATTERNS,
  PLAYSTATION_MIN_PRICE_AMD,
  DYSON_MIN_PRICE_AMD,
} = require("./targets.cjs");

const DYSON_COMPOUND_COLORS = [
  "Red Velvet Gold",
  "Red Velvet / Gold",
  "Vinca Blue Topaz",
  "Ceramic Vinca Blue",
  "Ceramic Prussian Blue",
  "Ceramic Amber Silk",
  "Ceramic Apricot",
  "Ceramic Pink",
  "Ceramic Patina",
  "Ceramic Pink / Rose Gold",
  "Nickel Copper",
  "Copper Nickel",
  "Bright Nickel",
  "Rich Copper",
  "Prussian Blue",
  "Amber Silk",
  "Jasper Plum",
  "Patina Topaz",
  "Apricot Topaz",
  "Strawberry Bronze",
  "Kanzan Pink",
  "Blue Blush",
  "Sakura Cherry",
  "Fuchsia / Nickel",
  "Black / Nickel",
  "Iron / Fuchsia",
  "SG/MY/HK",
];

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
    .replace(/\bi\.?\s*d\.?\b/g, "id")
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

function looksLikeCompleteHairDevice(text) {
  if (
    /\b(supersonic|airwrap|airstrait|corrale|hs0[3589]|ht01|hd1[678]|hd08|multi-?styler|hair styler|hair dryer|straightener)\b/.test(
      text,
    )
  ) {
    return true;
  }
  return false;
}

function isStandaloneAccessory(name, model = "", url = "") {
  const text = haystack(name, model, url);
  if (!/\bdyson\b/.test(text)) return false;
  if (!containsKeyword(text, DYSON_ACCESSORY_REJECT_KEYWORDS)) return false;

  // Complete device packages may mention brushes/attachments in title or URL — allow when device signal is clear.
  if (looksLikeCompleteHairDevice(text)) {
    const accessoryOnly =
      /\b(replacement|spare part|sold separately|wall mount|storage bag|travel pouch|presentation case)\b/.test(
        text,
      ) ||
      (/\b(barrel|diffuser|concentrator|filter|stand|attachment|brush|comb)\b/.test(text) &&
        !/\b(airwrap|supersonic|airstrait|corrale|hs0[3589]|ht01|hd\d{2}|complete|multi-?styler|hair styler|hair dryer)\b/.test(
          text,
        ));
    return accessoryOnly;
  }
  return true;
}

function isNonHairDyson(name, model = "", url = "") {
  const text = haystack(name, model, url);
  if (!/\bdyson\b/.test(text)) return false;
  // Avoid rejecting "Cool" colors falsely — require stronger climate signals where needed.
  if (/\b(purifier|humidifier|humidify|vacuum|cleaner|gen5|big ball|big.?quiet|solarcycle|zone|heater|hot.?cool)\b/.test(text)) {
    return true;
  }
  if (/\bv1[0-5]\b|\bv[78]\b/.test(text) && !looksLikeCompleteHairDevice(text)) return true;
  if (/\b(headphone|headphones|lamp|lighting)\b/.test(text)) return true;
  if (/\bfan\b/.test(text) && !looksLikeCompleteHairDevice(text)) return true;
  if (/\bcool\b/.test(text) && /\b(purifier|tower|desk|humidifier)\b/.test(text)) return true;
  return containsKeyword(text, DYSON_NON_HAIR_REJECT_KEYWORDS.filter((k) => k !== "cool" && k !== "fan" && k !== "wash"));
}

function isDysonHardRejected(name, model = "", url = "") {
  if (!/\bdyson\b/i.test(`${name} ${model} ${url}`)) return false;
  if (isNonHairDyson(name, model, url)) return true;
  if (isStandaloneAccessory(name, model, url)) return true;
  return false;
}

function isPlayStationHardRejected(name, model = "", url = "") {
  const text = haystack(name, model, url);
  const isPs = /\b(playstation|ps4|ps5|sony)\b/.test(text);
  if (!isPs) return false;
  return containsKeyword(text, PLAYSTATION_HARD_REJECT_KEYWORDS);
}

function isHairDryerProduct(name, model = "", url = "") {
  const parent = normalizeDysonParentModel(name, model, url);
  return Boolean(parent && DYSON_HAIR_DRYER_PARENT_MODELS.includes(parent));
}

function isDysonHairDevice(name, model = "", url = "") {
  const text = haystack(name, model, url);
  if (!/\bdyson\b/.test(text)) return false;
  if (isDysonHardRejected(name, model, url)) return false;
  if (normalizeDysonParentModel(name, model, url)) return true;
  return containsKeyword(text, DYSON_HAIR_DEVICE_HINTS);
}

/**
 * Classify Dyson family key for diagnostics.
 * @returns {string}
 */
function normalizeDysonProductFamily(name, model = "", url = "") {
  const text = haystack(name, model, url);
  if (!/\bdyson\b/.test(text)) return "reject-non-hair";
  if (isNonHairDyson(name, model, url)) return "reject-non-hair";
  if (isStandaloneAccessory(name, model, url)) return "reject-accessory";

  if (/\bsupersonic\s+travel\b/.test(text) || (/\btravel\b/.test(text) && /\bsupersonic\b/.test(text))) {
    return "supersonic-travel";
  }
  if (/\bsupersonic\s+nural\b/.test(text) || /\bnural\b/.test(text) || /\bhd16\b/.test(text)) {
    return "supersonic-nural";
  }
  if (/\bsupersonic\s+r\b/.test(text) || /\bsupersonic-r\b/.test(text) || /\bhd17\b/.test(text)) {
    return "supersonic-r";
  }
  if (/\bsupersonic\b/.test(text) || /\bhd08\b/.test(text) || /\bhd18\b/.test(text)) {
    return "supersonic";
  }

  if (/\bhs09\b/.test(text) || /\bco-?anda\s*2x\b/.test(text) || /\bcoanda2x\b/.test(text)) {
    return "airwrap-coanda2x-hs09";
  }
  if (
    /\bhs08\b/.test(text) ||
    /\bairwrap\s*i\.?\s*d\b/.test(text) ||
    /\bairwrap\s*id\b/.test(text) ||
    (/\bhair styler\b/.test(text) && /\bhs08\b/.test(text))
  ) {
    return "airwrap-id-hs08";
  }
  if (/\bhs05\b/.test(text) || (/\bairwrap\b/.test(text) && !/\bhs08\b/.test(text) && !/\bhs09\b/.test(text))) {
    if (/\bhs05\b/.test(text) || /\bcomplete\b/.test(text) || /\bmulti-?styler\b/.test(text) || /\bairwrap\b/.test(text)) {
      if (!/\bhs08\b/.test(text) && !/\bhs09\b/.test(text)) return "airwrap-hs05";
    }
  }
  if (/\bairwrap\b/.test(text) && /\bhs05\b/.test(text)) return "airwrap-hs05";

  if (/\bairstrait\b/.test(text) || /\bht01\b/.test(text)) return "airstrait";
  if (/\bcorrale\b/.test(text) || /\bhs03\b/.test(text)) return "corrale";

  if (/\bhair styler\b/.test(text) && /\bhs05\b/.test(text)) return "airwrap-hs05";
  if (/\bhair styler\b/.test(text) && /\bhs09\b/.test(text)) return "airwrap-coanda2x-hs09";

  if (containsKeyword(text, DYSON_HAIR_DEVICE_HINTS)) return "unknown-hair-device";
  return "reject-non-hair";
}

const FAMILY_TO_PARENT = {
  "supersonic-travel": "Dyson Supersonic Travel",
  "supersonic-nural": "Dyson Supersonic Nural",
  "supersonic-r": "Dyson Supersonic r",
  supersonic: "Dyson Supersonic",
  "airwrap-hs05": "Dyson Airwrap HS05",
  "airwrap-id-hs08": "Dyson Airwrap i.d. HS08",
  "airwrap-coanda2x-hs09": "Dyson Airwrap Co-anda2x HS09",
  airstrait: "Dyson Airstrait",
  corrale: "Dyson Corrale",
};

function normalizeDysonParentModel(name, model = "", url = "") {
  const family = normalizeDysonProductFamily(name, model, url);
  return FAMILY_TO_PARENT[family] || null;
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

function categoryForParentModel(parentModel) {
  if (DYSON_CATEGORY_BY_PARENT[parentModel]) return DYSON_CATEGORY_BY_PARENT[parentModel];
  if (String(parentModel || "").startsWith("Sony PlayStation")) return "Game Consoles";
  return null;
}

function categorySlugForParentModel(parentModel) {
  if (DYSON_CATEGORY_SLUG_BY_PARENT[parentModel]) return DYSON_CATEGORY_SLUG_BY_PARENT[parentModel];
  if (String(parentModel || "").startsWith("Sony PlayStation")) return "game-consoles";
  return null;
}

function matchesTarget(targetModel, candidateName, sourceUrl = "") {
  const normalized = parentModelKey(candidateName, candidateName, sourceUrl);
  if (normalize(normalized) !== normalize(targetModel)) {
    return { ok: false, reason: "wrong_parent_model", normalized };
  }

  const type = detectProductType(candidateName, candidateName, sourceUrl);
  if (targetModel.startsWith("Dyson")) {
    if (type !== "dyson") return { ok: false, reason: "not_dyson_hair_device" };
    if (!DYSON_HAIR_PARENT_MODELS.includes(normalized)) {
      return { ok: false, reason: "dyson_not_in_allowlist" };
    }
    if (isDysonHardRejected(candidateName, candidateName, sourceUrl)) {
      return { ok: false, reason: "dyson_hard_reject" };
    }
    if (!isDysonHairDevice(candidateName, candidateName, sourceUrl)) {
      return { ok: false, reason: "not_dyson_hair_device" };
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

function extractModelCode(text) {
  const n = cleanText(text);
  const match = n.match(/\b(HD\d{2,3}[A-Z]?|HS\d{2,3}|HT\d{2,3})\b/i);
  return match ? match[1].toUpperCase() : null;
}

function canonicalizeColorToken(raw) {
  let value = cleanText(raw)
    .replace(/[/_]+/g, " ")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!value) return null;
  // Prefer Title Case words
  value = value
    .split(" ")
    .map((part) => {
      if (/^[A-Z0-9]+$/.test(part) && part.length <= 6) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
  if (/^red velvet(?: gold)?$/i.test(value)) return "Red Velvet Gold";
  if (/^sg\s*my\s*hk$/i.test(normalize(value))) return "SG/MY/HK";
  return value;
}

function extractDysonColor(name, url = "") {
  const text = cleanText(`${name} ${url}`);
  const normalizedText = normalize(text);

  const sorted = [...DYSON_COMPOUND_COLORS].sort((a, b) => b.length - a.length);
  for (const candidate of sorted) {
    const needleSlash = normalize(candidate);
    const needleSpace = normalize(candidate.replace(/\//g, " "));
    if (normalizedText.includes(needleSlash) || normalizedText.includes(needleSpace)) {
      return canonicalizeColorToken(candidate);
    }
  }

  // Parenthetical color: (Nickel Copper) or (Straight+Wavy/Ceramic Pink)
  const paren = text.match(/\(([^)]+)\)/g);
  if (paren) {
    for (const block of paren) {
      const inner = block.slice(1, -1);
      if (/straight|curly|wavy|coily|complete|multi/i.test(inner) && /\//.test(inner)) {
        const afterSlash = inner.split("/").pop();
        if (afterSlash && !/straight|curly|wavy|coily/i.test(afterSlash)) {
          return canonicalizeColorToken(afterSlash);
        }
      }
      if (!/straight|curly|wavy|coily|complete|edition|digital|airwrap|airstrait|corrale|supersonic|nural/i.test(inner)) {
        const color = canonicalizeColorToken(inner);
        if (color && color.length >= 3 && color.length <= 40) return color;
      }
    }
  }

  // Trailing color after device family word
  const trailing = text.match(
    /(?:hair styler|airwrap(?:\s*i\.?\s*d\.?)?|airstrait|supersonic(?:\s+nural)?)\s+(.+)$/i,
  );
  if (trailing) {
    let tail = trailing[1]
      .replace(/\b(hs|hd|ht)\d{2,3}\b/gi, "")
      .replace(/\b(straight\s*\+?\s*wavy|curly\s*\+?\s*coily|complete(?:\s+long)?|multi-?styler|corrale)\b/gi, "")
      .replace(/[()]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (tail && !/^\d+$/.test(tail) && !/^corrale$/i.test(tail) && tail.length <= 40) {
      return canonicalizeColorToken(tail);
    }
  }

  return null;
}

function extractHairType(name, url = "") {
  const text = normalize(`${name} ${url}`);
  if (/\bcurly\s*\+?\s*coily\b/.test(text) || /\bcurly.?coily\b/.test(text)) return "Curly + Coily";
  if (/\bstraight\s*\+?\s*wavy\b/.test(text) || /\bstraight.?wavy\b/.test(text)) return "Straight + Wavy";
  return null;
}

function extractKit(name, parentModel, url = "") {
  const text = normalize(`${name} ${url}`);
  if (/\bcomplete\s+long\b/.test(text)) return "Complete Long";
  if (/\bcomplete\b/.test(text)) return "Complete";
  if (/\bmulti-?styler\b/.test(text)) return "Multi-Styler";
  if (parentModel === "Dyson Airwrap i.d. HS08" && (/\bi\.?\s*d\b/.test(text) || /\bid\b/.test(text))) {
    return "Airwrap i.d.";
  }
  if (parentModel === "Dyson Airwrap Co-anda2x HS09" && /\bco-?anda/.test(text)) {
    return "Co-anda2x";
  }
  return null;
}

function extractVariantOptions(name, parentModel, url = "") {
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
    const color = extractDysonColor(name, url);
    if (color) options.color = color;
    const code = extractModelCode(`${name} ${url}`);
    if (code) options.model_code = code;
    else if (parentModel === "Dyson Airwrap HS05") options.model_code = "HS05";
    else if (parentModel === "Dyson Airwrap i.d. HS08") options.model_code = "HS08";
    else if (parentModel === "Dyson Airwrap Co-anda2x HS09") options.model_code = "HS09";
    else if (parentModel === "Dyson Airstrait") options.model_code = options.model_code || "HT01";
    else if (parentModel === "Dyson Corrale") options.model_code = options.model_code || "HS03";

    const kit = extractKit(name, parentModel, url);
    if (kit) options.kit = kit;
    const hairType = extractHairType(name, url);
    if (hairType) options.hair_type = hairType;

    if (parentModel.startsWith("Dyson Supersonic")) {
      const edition = extractEdition(text);
      if (edition) options.edition = edition;
    }
  }

  return options;
}

function normalizeKitForDedupe(kit) {
  const value = cleanText(kit || "");
  if (!value) return "";
  // Generation labels are not distinguishing kit variants.
  if (/^airwrap\s*i\.?\s*d\.?$/i.test(value)) return "";
  if (/^co-?anda\s*2x$/i.test(value)) return "";
  return value;
}

/** Cross-source attribute key — no sourcePid (merge MC+YM same variant). */
function variantAttributeKey(variant) {
  const options = variant.options || {};
  return [
    normalize(variant.normalized_model || variant.model || variant.name),
    normalize(options.model_code || ""),
    normalize(options.color || ""),
    normalize(normalizeKitForDedupe(options.kit)),
    normalize(options.hair_type || ""),
    normalize(options.edition || ""),
    normalize(options.storage || ""),
    normalize(options.bundle || ""),
  ]
    .filter(Boolean)
    .join("|");
}

function variantDedupeKey(variant) {
  // Prefer attribute identity for Dyson so MC+YM merge; keep source for PS uniqueness path.
  const options = variant.options || {};
  if (String(variant.normalized_model || variant.model || "").startsWith("Dyson")) {
    return variantAttributeKey(variant);
  }
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

  const family = normalizeDysonProductFamily(name, name, variant.source_url || "");
  if (family === "unknown-hair-device") {
    return { ok: false, reason: "unknown_dyson_hair_device_manual_review" };
  }

  return {
    ok: true,
    normalized: match.normalized,
    type: match.type,
    category: categoryForParentModel(match.normalized),
    category_slug: categorySlugForParentModel(match.normalized),
  };
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
  normalizeDysonProductFamily,
  normalizePlayStationParentModel,
  isDysonHardRejected,
  isPlayStationHardRejected,
  isHairDryerProduct,
  isDysonHairDevice,
  isStandaloneAccessory,
  isNonHairDyson,
  isPlayStationConsoleProduct,
  isPlayStationGame,
  isPlayStationAccessoryProduct,
  isPlayStationConsoleBundle,
  minPriceForParentModel,
  extractVariantOptions,
  extractDysonColor,
  extractHairType,
  extractKit,
  extractModelCode,
  variantDedupeKey,
  variantAttributeKey,
  validateVariantForImport,
  categoryForParentModel,
  categorySlugForParentModel,
  canonicalizeColorToken,
};
