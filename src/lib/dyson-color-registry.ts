/**
 * Runtime Dyson CMF lookup. Exact alias match only — never hue-token fallback.
 * Data source: scripts/product-import/shared/dyson-color-entries.json
 */

import dysonColorEntries from '../../scripts/product-import/shared/dyson-color-entries.json';

export type DysonColorEntryStatus = 'resolved' | 'manual_review';

export type DysonColorEntry = {
  canonicalName: string;
  colors: string[];
  aliases: string[];
  status: DysonColorEntryStatus;
  notes?: string;
};

const AMBIGUOUS_SHORT_TOKENS = new Set([
  'vinca',
  'ceramic',
  'pink',
  'blue',
  'patina',
  'apricot',
  'topaz',
  'nickel',
  'copper',
  'gold',
  'amber',
  'silk',
  'jaspar',
  'jusper',
]);

const ENTRIES = dysonColorEntries as DysonColorEntry[];

/**
 * Same normalization as scripts/product-import/shared/dyson-color-registry.cjs
 */
export function normalizeDysonColorKey(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(/['’‑–—]/g, '-')
    .replace(/[/_]+/g, ' ')
    .replace(/[^a-z0-9\s+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildAliasIndex(): Map<string, DysonColorEntry> {
  const index = new Map<string, DysonColorEntry>();
  for (const entry of ENTRIES) {
    const keys = new Set([
      normalizeDysonColorKey(entry.canonicalName),
      ...entry.aliases.map((alias) => normalizeDysonColorKey(alias)),
    ]);
    for (const key of keys) {
      if (!key) continue;
      const existing = index.get(key);
      if (existing && existing.canonicalName !== entry.canonicalName) {
        throw new Error(
          `Dyson color alias conflict: "${key}" → ${existing.canonicalName} vs ${entry.canonicalName}`,
        );
      }
      index.set(key, entry);
    }
  }
  return index;
}

const ALIAS_INDEX = buildAliasIndex();

/**
 * HEX ցուցակ Dyson CMF անվան համար։ Դատարկ է, եթե անունը Dyson alias չէ։
 */
export function resolveDysonSwatchHexes(colorName: string): string[] {
  const key = normalizeDysonColorKey(colorName);
  if (!key || AMBIGUOUS_SHORT_TOKENS.has(key)) return [];

  const entry = ALIAS_INDEX.get(key);
  if (!entry || entry.status !== 'resolved' || entry.colors.length === 0) {
    return [];
  }
  return [...entry.colors];
}

export function listDysonColorEntries(): DysonColorEntry[] {
  return ENTRIES.map((entry) => ({ ...entry, colors: [...entry.colors], aliases: [...entry.aliases] }));
}
