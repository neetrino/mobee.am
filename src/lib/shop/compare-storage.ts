/** Must match `STORAGE_KEYS.compare` in `storageCounts.ts`. */
export const SHOP_COMPARE_STORAGE_KEY = 'shop_compare';

export const MAX_COMPARE_PER_CATEGORY = 4;

/** Products without a category are grouped together under this id. */
export const COMPARE_UNCATEGORIZED_KEY = '__uncategorized';

export const COMPARE_STORAGE_VERSION = 2 as const;

export interface CompareEntry {
  productId: string;
  categoryId: string;
}

interface CompareStorageV2 {
  v: typeof COMPARE_STORAGE_VERSION;
  entries: CompareEntry[];
}

function isCompareEntry(value: unknown): value is CompareEntry {
  if (typeof value !== 'object' || value === null) return false;
  const o = value as Record<string, unknown>;
  return typeof o.productId === 'string' && typeof o.categoryId === 'string';
}

function persistEntries(entries: CompareEntry[]): void {
  const payload: CompareStorageV2 = { v: COMPARE_STORAGE_VERSION, entries };
  window.localStorage.setItem(SHOP_COMPARE_STORAGE_KEY, JSON.stringify(payload));
}

/**
 * Resolves the category id used for compare grouping.
 * Uses primary when set; otherwise last id in `categoryIds` (typical leaf) so listing cards
 * still get a stable bucket without loading the categories join.
 */
export function resolveCompareCategoryId(product: {
  primaryCategoryId?: string | null;
  categoryIds?: ReadonlyArray<string> | null;
  categories?: ReadonlyArray<{ id: string }> | null;
}): string {
  const primary = product.primaryCategoryId?.trim();
  if (primary) return primary;

  const rawIds = product.categoryIds?.filter((id) => typeof id === 'string' && id.trim().length > 0) ?? [];
  if (rawIds.length === 1) {
    return rawIds[0]!.trim();
  }
  if (rawIds.length > 1) {
    return rawIds[rawIds.length - 1]!.trim();
  }

  const first = product.categories?.[0]?.id?.trim();
  if (first) return first;
  return COMPARE_UNCATEGORIZED_KEY;
}

/**
 * Reads compare entries from localStorage; migrates legacy `string[]` to v2 with empty categoryId (hydrate after fetch).
 */
export function readCompareEntries(): CompareEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SHOP_COMPARE_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      if (parsed.every((x): x is string => typeof x === 'string')) {
        const migrated: CompareEntry[] = parsed.map((productId) => ({
          productId,
          categoryId: '',
        }));
        persistEntries(migrated);
        return migrated;
      }
      return [];
    }

    if (
      parsed &&
      typeof parsed === 'object' &&
      (parsed as CompareStorageV2).v === COMPARE_STORAGE_VERSION &&
      Array.isArray((parsed as CompareStorageV2).entries)
    ) {
      return (parsed as CompareStorageV2).entries.filter(isCompareEntry);
    }

    return [];
  } catch {
    return [];
  }
}

export function writeCompareEntries(entries: CompareEntry[]): void {
  if (typeof window === 'undefined') return;
  persistEntries(entries);
}

export function getCompareProductIds(entries: CompareEntry[]): string[] {
  return entries.map((e) => e.productId);
}

export function isProductIdInCompare(productId: string, entries?: CompareEntry[]): boolean {
  const list = entries ?? readCompareEntries();
  return list.some((e) => e.productId === productId);
}

export type ToggleCompareOutcome = 'added' | 'removed' | 'group_full';

/**
 * Adds or removes a product in compare storage. Same category shares one block (max 4 per category).
 */
export function toggleCompareProduct(
  productId: string,
  categoryId: string,
): { outcome: ToggleCompareOutcome; entries: CompareEntry[] } {
  const categoryKey =
    categoryId.trim().length > 0 ? categoryId.trim() : COMPARE_UNCATEGORIZED_KEY;
  let entries = readCompareEntries();

  const existingIdx = entries.findIndex((e) => e.productId === productId);
  if (existingIdx >= 0) {
    entries = entries.filter((e) => e.productId !== productId);
    writeCompareEntries(entries);
    return { outcome: 'removed', entries };
  }

  const inSameCategory = entries.filter((e) => e.categoryId === categoryKey);
  if (inSameCategory.length >= MAX_COMPARE_PER_CATEGORY) {
    return { outcome: 'group_full', entries };
  }

  entries = [...entries, { productId, categoryId: categoryKey }];
  writeCompareEntries(entries);
  return { outcome: 'added', entries };
}

/**
 * Re-assigns each compare entry's category from fresh API data so groups stay correct
 * (fixes stale storage and listing cards that only had `categoryIds`, not `categories`).
 */
export function reconcileCompareEntriesWithProducts(
  products: ReadonlyArray<{
    id: string;
    primaryCategoryId?: string | null;
    categoryIds?: ReadonlyArray<string> | null;
    categories?: ReadonlyArray<{ id: string }> | null;
  }>,
): CompareEntry[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const entries = readCompareEntries();
  let changed = false;
  const next = entries.map((e) => {
    const p = byId.get(e.productId);
    if (!p) return e;
    const resolved = resolveCompareCategoryId(p);
    if (e.categoryId !== resolved) {
      changed = true;
    }
    return { productId: e.productId, categoryId: resolved };
  });
  if (changed) {
    writeCompareEntries(next);
  }
  return next;
}

type ProductForCompareGrouping = {
  id: string;
  primaryCategoryId?: string | null;
  categoryIds?: ReadonlyArray<string> | null;
  categories?: ReadonlyArray<{ id: string }> | null;
};

/**
 * Display groups follow compare list order; bucket key is always derived from the loaded product
 * so phones vs watches split even when stored `categoryId` was stale (e.g. all `__uncategorized`).
 */
export function groupCompareEntriesByResolvedCategory(
  entries: CompareEntry[],
  productById: ReadonlyMap<string, ProductForCompareGrouping>,
): CompareEntry[][] {
  const categoryOrder: string[] = [];
  const buckets = new Map<string, CompareEntry[]>();

  for (const e of entries) {
    const p = productById.get(e.productId);
    if (!p) continue;
    const key = resolveCompareCategoryId(p);
    if (!buckets.has(key)) {
      categoryOrder.push(key);
      buckets.set(key, []);
    }
    buckets.get(key)!.push(e);
  }

  return categoryOrder.map((id) => buckets.get(id) ?? []);
}
