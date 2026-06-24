import { APPLE_PRODUCT_WHITELIST } from "./whitelist.constants";

const DASH_CHARS = /[\u2010\u2011\u2012\u2013\u2014\u2212]/g;
const TRAILING_SKU_PATTERN =
  /\s+(?:\([A-Z0-9]*\d[A-Z0-9]{1,9}\)|[A-Z]{1,3}\d[A-Z0-9]{2,6}(?:\/[A-Z]+)?)\s*$/g;
const ACCESSORY_REMAINDER_PATTERN =
  /^(bumper|case|band|strap|keyboard|charger|cable|adapter|reader|cover|folio|pouch|screen protector)\b/i;

export type ProductMatchResult = "keep" | "delete" | "ambiguous";

export interface ProductMatchDetails {
  result: ProductMatchResult;
  baseName: string;
  normalizedBaseName: string;
  matchedWhitelistEntry: string | null;
  ambiguityReason: string | null;
}

const whitelistByLength = [...APPLE_PRODUCT_WHITELIST].sort(
  (left, right) => normalizeProductName(right).length - normalizeProductName(left).length,
);

/**
 * Strip import prefixes and collapse whitespace from a raw catalog title.
 */
export function extractBaseProductName(rawTitle: string): string {
  return rawTitle
    .replace(/^Mobile\s+Centre\.\s*-\s*/i, "")
    .replace(/^A\.\s+/i, "")
    .replace(/\(\.A\)\s*/g, "")
    .replace(DASH_CHARS, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalize inch variants: `13.6 inch`, `13-inch`, `13 in` → `13-inch`. */
function normalizeInchTokens(value: string): string {
  return value
    .replace(/(\d+(?:\.\d+)?)\s*-?\s*(?:inch|in\.?)\b/gi, (_, size: string) => {
      const numeric = Number.parseFloat(size);
      const whole = Number.isFinite(numeric) ? Math.floor(numeric) : size;
      return `${whole}-inch`;
    })
    .replace(/(\d+)\.\d+-inch/g, (_, size: string) => `${size}-inch`);
}

/** Reorder MobileCentre iPad Air titles: `iPad 11 Air M4` → `iPad Air 11 M4`. */
function normalizeIpadAirTitle(value: string): string {
  return value.replace(/\bipad\s+(\d{1,2})\s+air\s+(m\d+)\b/gi, "iPad Air $1 $2");
}

/** Prepare a catalog title for safe whitelist comparison. */
export function normalizeProductName(name: string): string {
  let value = extractBaseProductName(name)
    .replace(/^Apple\s+/i, "")
    .replace(/\s*\/\s*Apple\s+/gi, " ")
    .replace(/\s+Apple\s+(?=(?:M\d|[A]\d{1,2}\b))/gi, " ")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(TRAILING_SKU_PATTERN, "");

  value = normalizeInchTokens(value);
  value = normalizeIpadAirTitle(value);
  value = value.split("/")[0]?.trim() ?? value;

  return value.replace(DASH_CHARS, "-").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Normalized whitelist lookup: normalized name → canonical whitelist label. */
const normalizedWhitelistMap = new Map<string, string>(
  APPLE_PRODUCT_WHITELIST.map((name) => [normalizeProductName(name), name]),
);

function hasSafePrefixBoundary(normalizedTitle: string, normalizedWhitelist: string): boolean {
  if (normalizedTitle === normalizedWhitelist) return true;

  if (normalizedTitle.startsWith(`${normalizedWhitelist}/`)) {
    return true;
  }

  if (!normalizedTitle.startsWith(`${normalizedWhitelist} `)) return false;

  const remainder = normalizedTitle.slice(normalizedWhitelist.length + 1);
  return !ACCESSORY_REMAINDER_PATTERN.test(remainder);
}

function findMatchingWhitelistEntries(normalizedTitle: string): string[] {
  const exact = normalizedWhitelistMap.get(normalizedTitle);
  if (exact) return [exact];

  const prefixMatches: string[] = [];
  for (const entry of whitelistByLength) {
    const normalizedEntry = normalizeProductName(entry);
    if (hasSafePrefixBoundary(normalizedTitle, normalizedEntry)) {
      prefixMatches.push(entry);
      break;
    }
  }

  return prefixMatches;
}

/**
 * Classify a product using exact or safe longest-prefix whitelist matching.
 * Ambiguous when locale titles disagree, the base name is missing, or multiple whitelist entries match.
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

export function isAppleBrandSlug(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return slug === "apple" || slug.startsWith("apple-");
}
