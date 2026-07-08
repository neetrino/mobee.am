import {
  SAMSUNG_ACCESSORY_PATTERNS,
  SAMSUNG_HARD_REJECT_PATTERNS,
  SAMSUNG_PHONE_WHITELIST,
} from "./whitelist.constants";

const DASH_CHARS = /[\u2010\u2011\u2012\u2013\u2014\u2212]/g;
const TRAILING_SKU_PATTERN =
  /\s+(?:\([A-Z0-9]*\d[A-Z0-9]{1,9}\)|SM-[A-Z0-9]{2,10}|SM[A-Z0-9]{2,10})\s*$/gi;

export type ProductMatchResult = "keep" | "delete" | "ambiguous";

export interface ProductMatchDetails {
  result: ProductMatchResult;
  baseName: string;
  normalizedBaseName: string;
  matchedWhitelistEntry: string | null;
  ambiguityReason: string | null;
}

const whitelistByLength = [...SAMSUNG_PHONE_WHITELIST].sort(
  (left, right) => normalizeProductName(right).length - normalizeProductName(left).length,
);

/** Strip import prefixes and collapse whitespace from a raw catalog title. */
export function extractBaseProductName(rawTitle: string): string {
  return rawTitle
   .replace(/^Mobile\s+Centre\.\s*-\s*/i, "")
    .replace(/^A\.\s+/i, "")
    .replace(DASH_CHARS, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Prepare a Samsung catalog title for safe whitelist comparison. */
export function normalizeProductName(name: string): string {
  const value = extractBaseProductName(name)
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(TRAILING_SKU_PATTERN, "")
    .replace(DASH_CHARS, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  return value;
}

const normalizedWhitelistMap = new Map<string, string>(
  SAMSUNG_PHONE_WHITELIST.map((name) => [normalizeProductName(name), name]),
);

function isHardRejected(normalizedTitle: string): boolean {
  return SAMSUNG_HARD_REJECT_PATTERNS.some((pattern) => pattern.test(normalizedTitle));
}

function isAccessoryTitle(normalizedTitle: string): boolean {
  return SAMSUNG_ACCESSORY_PATTERNS.some((pattern) => pattern.test(normalizedTitle));
}

function hasSafePrefixBoundary(normalizedTitle: string, normalizedWhitelist: string): boolean {
  if (normalizedTitle === normalizedWhitelist) return true;
  if (!normalizedTitle.startsWith(`${normalizedWhitelist} `)) return false;
  return !isAccessoryTitle(normalizedTitle);
}

function findMatchingWhitelistEntries(normalizedTitle: string): string[] {
  const exact = normalizedWhitelistMap.get(normalizedTitle);
  if (exact) return [exact];

  for (const entry of whitelistByLength) {
    const normalizedEntry = normalizeProductName(entry);
    if (hasSafePrefixBoundary(normalizedTitle, normalizedEntry)) {
      return [entry];
    }
  }

  return [];
}

/**
 * Classify a Samsung phone product using exact or safe longest-prefix whitelist matching.
 */
export function classifyProductByTitles(titles: string[]): ProductMatchDetails {
  const cleanedTitles = titles.map(extractBaseProductName).filter(Boolean);
  const normalizedTitles = [...new Set(cleanedTitles.map(normalizeProductName))];

  if (cleanedTitles.length === 0) {
    return {
      result: "ambiguous",
      baseName: "",
      normalizedBaseName: "",
      matchedWhitelistEntry: null,
      ambiguityReason: "Missing product title in all locales",
    };
  }

  if (normalizedTitles.length > 1) {
    return {
      result: "ambiguous",
      baseName: cleanedTitles[0] ?? "",
      normalizedBaseName: normalizedTitles[0] ?? "",
      matchedWhitelistEntry: null,
      ambiguityReason: `Conflicting locale titles: ${cleanedTitles.join(" | ")}`,
    };
  }

  const baseName = cleanedTitles[0] ?? "";
  const normalizedBaseName = normalizedTitles[0] ?? "";

  if (!/\b(samsung|galaxy)\b/i.test(normalizedBaseName)) {
    return {
      result: "delete",
      baseName,
      normalizedBaseName,
      matchedWhitelistEntry: null,
      ambiguityReason: null,
    };
  }

  if (isHardRejected(normalizedBaseName)) {
    return {
      result: "delete",
      baseName,
      normalizedBaseName,
      matchedWhitelistEntry: null,
      ambiguityReason: null,
    };
  }

  if (isAccessoryTitle(normalizedBaseName)) {
    return {
      result: "delete",
      baseName,
      normalizedBaseName,
      matchedWhitelistEntry: null,
      ambiguityReason: null,
    };
  }

  const matchedEntries = findMatchingWhitelistEntries(normalizedBaseName);

  if (matchedEntries.length > 1) {
    return {
      result: "ambiguous",
      baseName,
      normalizedBaseName,
      matchedWhitelistEntry: null,
      ambiguityReason: `Multiple whitelist matches: ${matchedEntries.join(", ")}`,
    };
  }

  const matchedWhitelistEntry = matchedEntries[0] ?? null;

  if (matchedWhitelistEntry) {
    return {
      result: "keep",
      baseName,
      normalizedBaseName,
      matchedWhitelistEntry,
      ambiguityReason: null,
    };
  }

  return {
    result: "delete",
    baseName,
    normalizedBaseName,
    matchedWhitelistEntry: null,
    ambiguityReason: null,
  };
}

export function isSamsungBrandSlug(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return slug === "samsung" || slug.startsWith("samsung-");
}
