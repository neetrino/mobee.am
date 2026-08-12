"use strict";

/**
 * Shared Marco import matrix: 5 brands × 4 categories = 20 groups.
 * Category patterns are reused from the proven original groups.
 */

const CATEGORY_RULES = {
  tv: {
    categoryKey: "tv",
    categoryLabel: "телевизоры",
    includePatterns: [
      "телевизор",
      "television",
      "televisions",
      "smart tv",
      "հեռուստացույց",
    ],
    allowTvToken: true,
    excludePatterns: [
      "apple tv",
      "accessory",
      "аксессуар",
      "remote",
      "пульт",
      "mount",
      "крепление",
      "bracket",
      "stand",
      "подставк",
      "soundbar",
      "саундбар",
      "cover",
      "чехол",
    ],
  },
  refrigerators: {
    categoryKey: "refrigerators",
    categoryLabel: "холодильники",
    includePatterns: [
      "холодильник",
      "refrigerator",
      "fridge",
      "սառնարան",
    ],
    excludePatterns: [
      "accessory",
      "accessories",
      "аксессуар",
      "filter",
      "фильтр",
      "part",
      "запчаст",
      "shelf",
      "полк",
      "freezer only",
      "морозильник",
    ],
  },
  "air-conditioners": {
    categoryKey: "air-conditioners",
    categoryLabel: "кондиционеры",
    includePatterns: [
      "кондиционер",
      "air conditioner",
      "air-conditioning",
      "air conditioning",
      "aircondition",
      "օդորակիչ",
    ],
    allowAcToken: true,
    excludePatterns: [
      "accessory",
      "accessories",
      "аксессуар",
      "пульт",
      "remote",
      "filter",
      "фильтр",
      "крепление",
      "mount",
      "part",
      "запчаст",
      "cover",
      "чехол",
      "heater only",
      "обогреватель",
    ],
  },
  "washing-machines": {
    categoryKey: "washing-machines",
    categoryLabel: "стиральные машины",
    includePatterns: [
      "стиральн",
      "washing machine",
      "washing machines",
      "washing-machine",
      "լվացքի մեքեն",
    ],
    allowWasherToken: true,
    // Union of LG + Hisense excludes (LG had powder/порошок; keep both safe).
    excludePatterns: [
      "посудомо",
      "dishwasher",
      "dish washer",
      "սպասք լվացող",
      "dryer",
      "сушильн",
      "accessory",
      "аксессуар",
      "filter",
      "фильтр",
      "part",
      "запчаст",
      "hose",
      "шланг",
      "powder",
      "порошок",
    ],
  },
};

const BRAND_RULES = {
  samsung: {
    brandKey: "samsung",
    brand: "Samsung",
    brandAliases: ["samsung"],
  },
  midea: {
    brandKey: "midea",
    brand: "Midea",
    brandAliases: ["midea"],
  },
  bosch: {
    brandKey: "bosch",
    brand: "Bosch",
    brandAliases: ["bosch"],
  },
  lg: {
    brandKey: "lg",
    brand: "LG",
    brandAliases: ["lg"],
  },
  hisense: {
    brandKey: "hisense",
    brand: "Hisense",
    brandAliases: ["hisense"],
  },
};

const BRAND_ORDER = ["samsung", "midea", "bosch", "lg", "hisense"];
const CATEGORY_ORDER = [
  "tv",
  "refrigerators",
  "air-conditioners",
  "washing-machines",
];

function buildGroups() {
  /** @type {Record<string, object>} */
  const groups = {};
  for (const brandKey of BRAND_ORDER) {
    const brand = BRAND_RULES[brandKey];
    for (const categoryKey of CATEGORY_ORDER) {
      const category = CATEGORY_RULES[categoryKey];
      const key = `${brandKey}-${categoryKey}`;
      groups[key] = {
        key,
        brandKey,
        categoryKey,
        brand: brand.brand,
        brandAliases: [...brand.brandAliases],
        categoryLabel: category.categoryLabel,
        includePatterns: [...category.includePatterns],
        excludePatterns: [...category.excludePatterns],
        ...(category.allowTvToken ? { allowTvToken: true } : {}),
        ...(category.allowWasherToken ? { allowWasherToken: true } : {}),
        ...(category.allowAcToken ? { allowAcToken: true } : {}),
      };
    }
  }
  return groups;
}

const GROUPS = buildGroups();

const GROUP_TO_BRAND = Object.fromEntries(
  Object.values(GROUPS).map((g) => [g.key, g.brandKey])
);

const GROUP_KEYS = Object.keys(GROUPS);

const ALLOWED_BRAND_KEYS = new Set(Object.keys(BRAND_RULES));

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function matchesAny(haystack, patterns) {
  const text = normalizeText(haystack);
  return patterns.some((p) => text.includes(normalizeText(p)));
}

function hasWholeWord(haystack, word) {
  const text = normalizeText(haystack);
  const re = new RegExp(`(^|[^a-z0-9а-яё])${word}([^a-z0-9а-яё]|$)`, "i");
  return re.test(text);
}

/**
 * Same semantics as the original import-marco-products category matcher.
 */
function categoryMatchesGroup(group, category) {
  const blob = `${category.title || ""} ${category.slug || ""} ${category.path || ""}`;
  if (matchesAny(blob, group.excludePatterns || [])) return false;
  if (matchesAny(blob, group.includePatterns || [])) return true;
  if (group.allowWasherToken) {
    if (hasWholeWord(blob, "washer") || hasWholeWord(blob, "washers")) return true;
  }
  if (group.allowTvToken) {
    if (
      hasWholeWord(blob, "tv") ||
      hasWholeWord(blob, "tvs") ||
      category.slug === "tv" ||
      /(^|[-_/])tvs?($|[-_/])/i.test(category.slug || "")
    ) {
      return true;
    }
  }
  if (group.allowAcToken) {
    if (
      hasWholeWord(blob, "ac") ||
      /(^|[-_/])acs?($|[-_/])/i.test(category.slug || "")
    ) {
      return true;
    }
  }
  return false;
}

/**
 * True if category blob matches any of the 4 allowed Marco categories.
 */
function categoryMatchesAllowedMatrix(category) {
  for (const categoryKey of CATEGORY_ORDER) {
    const rule = CATEGORY_RULES[categoryKey];
    const pseudoGroup = {
      includePatterns: rule.includePatterns,
      excludePatterns: rule.excludePatterns,
      allowTvToken: rule.allowTvToken,
      allowWasherToken: rule.allowWasherToken,
      allowAcToken: rule.allowAcToken,
    };
    if (categoryMatchesGroup(pseudoGroup, category)) return true;
  }
  return false;
}

function resolveGroupForBrandAndCategory(brandKey, category) {
  if (!ALLOWED_BRAND_KEYS.has(brandKey)) return null;
  for (const categoryKey of CATEGORY_ORDER) {
    const group = GROUPS[`${brandKey}-${categoryKey}`];
    if (group && categoryMatchesGroup(group, category)) return group;
  }
  return null;
}

module.exports = {
  CATEGORY_RULES,
  BRAND_RULES,
  BRAND_ORDER,
  CATEGORY_ORDER,
  GROUPS,
  GROUP_KEYS,
  GROUP_TO_BRAND,
  ALLOWED_BRAND_KEYS,
  normalizeText,
  matchesAny,
  hasWholeWord,
  categoryMatchesGroup,
  categoryMatchesAllowedMatrix,
  resolveGroupForBrandAndCategory,
};
