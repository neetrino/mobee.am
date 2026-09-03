/**
 * Resolves marketing color names (Titanium Black, Phantom Violet, …)
 * to canonical PRODUCT_COLOR_HEX keys.
 */

export function normalizeColorKey(colorName: string): string {
  return colorName.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function compactColorKey(colorName: string): string {
  return normalizeColorKey(colorName).replace(/[\s_/-]+/g, '');
}

const GENERIC_MATERIAL_TOKENS = new Set([
  'titanium',
  'phantom',
  'awesome',
  'metallic',
  'matte',
  'gloss',
  'glossy',
  'ceramic',
  'frost',
  'satin',
  'pearl',
  'silk',
  'velvet',
]);

const MIN_COMPOUND_PART_LENGTH = 3;

export type ProductColorLookupIndexes = {
  compactToCanonical: Record<string, string>;
  sortedWordsToCanonical: Record<string, string>;
  knownKeysByLength: string[];
};

function tokenizeColorName(name: string): string[] {
  return normalizeColorKey(name)
    .split(/[\s_/-]+/)
    .filter(Boolean);
}

function sortedWordsKey(name: string): string {
  return tokenizeColorName(name).sort().join(' ');
}

/**
 * Precomputed indexes so PDP/listing color lookup stays O(1) for common names.
 */
export function buildColorLookupIndexes(
  hexMap: Record<string, string>,
): ProductColorLookupIndexes {
  const compactToCanonical: Record<string, string> = {};
  const sortedWordsToCanonical: Record<string, string> = {};

  for (const key of Object.keys(hexMap)) {
    const compact = compactColorKey(key);
    if (!(compact in compactToCanonical)) {
      compactToCanonical[compact] = key;
    }
    const sorted = sortedWordsKey(key);
    if (!(sorted in sortedWordsToCanonical)) {
      sortedWordsToCanonical[sorted] = key;
    }
  }

  return {
    compactToCanonical,
    sortedWordsToCanonical,
    knownKeysByLength: Object.keys(hexMap).sort((a, b) => b.length - a.length),
  };
}

function containsConsecutive(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  return haystack.some((_, index) =>
    needle.every((word, offset) => haystack[index + offset] === word),
  );
}

function matchHueToken(
  normalizedName: string,
  knownKeysByLength: string[],
): string | null {
  const words = tokenizeColorName(normalizedName);
  if (words.length === 0) return null;

  const matches = knownKeysByLength.filter((known) =>
    containsConsecutive(words, tokenizeColorName(known)),
  );
  if (matches.length === 0) return null;

  const hueMatches = matches.filter((item) => !GENERIC_MATERIAL_TOKENS.has(item));
  return hueMatches[0] ?? matches[0] ?? null;
}

function splitCompoundCompact(
  compact: string,
  compactToCanonical: Record<string, string>,
): string | null {
  const parts = Object.keys(compactToCanonical)
    .filter((item) => item.length >= MIN_COMPOUND_PART_LENGTH)
    .sort((a, b) => b.length - a.length);

  for (const left of parts) {
    if (!compact.startsWith(left) || compact === left) continue;
    const rightKey = compactToCanonical[compact.slice(left.length)];
    if (!rightKey) continue;
    const leftKey = compactToCanonical[left];
    const leftGeneric = GENERIC_MATERIAL_TOKENS.has(leftKey);
    const rightGeneric = GENERIC_MATERIAL_TOKENS.has(rightKey);
    if (leftGeneric && !rightGeneric) return rightKey;
    if (rightGeneric && !leftGeneric) return leftKey;
    return rightKey;
  }

  return null;
}

export function resolveCanonicalColorKey(
  colorName: string,
  hexMap: Record<string, string>,
  indexes: ProductColorLookupIndexes,
  translatedAliases: Record<string, string>,
): string | null {
  const key = normalizeColorKey(colorName);
  if (!key) return null;
  if (key in hexMap) return key;

  const compact = compactColorKey(key);
  if (compact in hexMap) return compact;
  if (compact in indexes.compactToCanonical) {
    return indexes.compactToCanonical[compact];
  }

  const aliased = translatedAliases[key];
  if (aliased && aliased in hexMap) return aliased;

  const sorted = sortedWordsKey(key);
  if (sorted in indexes.sortedWordsToCanonical) {
    return indexes.sortedWordsToCanonical[sorted];
  }

  return (
    matchHueToken(key, indexes.knownKeysByLength) ??
    splitCompoundCompact(compact, indexes.compactToCanonical)
  );
}
