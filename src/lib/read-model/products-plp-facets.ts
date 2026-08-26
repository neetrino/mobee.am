import { db } from "@white-shop/db";
import type { ProductFilters } from "@/lib/services/products-find-query/types";
import { normalizeCatalogQuery, type CanonicalCatalogQuery } from "@/lib/catalog/catalog-query";
import { getBestsellerProductIdsRanked } from "@/lib/catalog/bestsellers";
import { CATALOG_SIZE_ORDER } from "@/lib/catalog/catalog.constants";
import { adminSettingsService } from "@/lib/services/admin/admin-settings.service";
import { buildListingRowWhere } from "@/lib/read-model/products-plp-read-model-where";
import type { ListingColorFacetValue } from "@/lib/read-model/product-listing-row-tokens";

type ListingFacetRow = {
  productId: string;
  brandId: string | null;
  brandName: string | null;
  colorTokens: string[];
  sizeTokens: string[];
  variantComboTokens: string[];
  colors: ListingColorFacetValue[];
  priceSort: number;
  hasPrice: boolean;
};

function parseColors(value: unknown): ListingColorFacetValue[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ListingColorFacetValue => {
    return Boolean(item && typeof item === "object" && typeof (item as { value?: unknown }).value === "string");
  });
}

function matchesPrice(row: ListingFacetRow, query: CanonicalCatalogQuery): boolean {
  if (query.minPrice === undefined && query.maxPrice === undefined) return true;
  if (!row.hasPrice) return false;
  if (query.minPrice !== undefined && row.priceSort < query.minPrice) return false;
  if (query.maxPrice !== undefined && row.priceSort > query.maxPrice) return false;
  return true;
}

function matchesBrand(row: ListingFacetRow, query: CanonicalCatalogQuery): boolean {
  if (query.brands.length === 0) return true;
  if (row.brandId && query.brands.includes(row.brandId)) return true;
  const name = row.brandName?.trim().toLowerCase();
  return Boolean(name && query.brands.some((token) => token.toLowerCase() === name));
}

function matchesTokens(tokens: string[], selected: string[]): boolean {
  if (selected.length === 0) return true;
  return selected.some((token) => tokens.includes(token));
}

function matchesColorAndSize(row: ListingFacetRow, colors: string[], sizes: string[]): boolean {
  if (colors.length === 0 && sizes.length === 0) return true;
  if (colors.length > 0 && sizes.length > 0) {
    return colors.some((color) =>
      sizes.some((size) => row.variantComboTokens.includes(`c:${color}|s:${size}`)),
    );
  }
  if (colors.length > 0) return matchesTokens(row.colorTokens, colors);
  return matchesTokens(row.sizeTokens, sizes);
}

export async function getCatalogFacetsFromReadModel(
  filters: ProductFilters,
) {
  const query = normalizeCatalogQuery(filters);
  let stepSize: number | null = null;
  let stepSizePerCurrency: Record<string, number | undefined> | null = null;
  try {
    const settings = await adminSettingsService.getPriceFilterSettings();
    stepSize = settings.stepSize ?? null;
    stepSizePerCurrency = settings.stepSizePerCurrency
      ? {
          USD: settings.stepSizePerCurrency.USD ?? undefined,
          AMD: settings.stepSizePerCurrency.AMD ?? undefined,
          RUB: settings.stepSizePerCurrency.RUB ?? undefined,
          GEL: settings.stepSizePerCurrency.GEL ?? undefined,
        }
      : null;
  } catch {
    stepSize = null;
    stepSizePerCurrency = null;
  }

  const needsBestsellers = query.filter === "bestseller" || query.sort === "bestseller";
  const bestsellerProductIds = needsBestsellers ? await getBestsellerProductIdsRanked() : [];
  const baseQuery: CanonicalCatalogQuery = {
    ...query,
    brands: [],
    colors: [],
    sizes: [],
    minPrice: undefined,
    maxPrice: undefined,
  };
  const where = await buildListingRowWhere(baseQuery, bestsellerProductIds);
  if (where === null) {
    return {
      colors: [],
      sizes: [],
      brands: [],
      priceRange: { min: 0, max: 0, hasProducts: false, stepSize, stepSizePerCurrency },
    };
  }

  const rawRows = await db.productListingRow.findMany({
    where,
    select: {
      productId: true,
      brandId: true,
      brandName: true,
      colorTokens: true,
      sizeTokens: true,
      variantComboTokens: true,
      colors: true,
      priceSort: true,
      hasPrice: true,
    },
  });
  const rows: ListingFacetRow[] = rawRows.map((row) => ({
    productId: row.productId,
    brandId: row.brandId,
    brandName: row.brandName,
    colorTokens: row.colorTokens,
    sizeTokens: row.sizeTokens,
    variantComboTokens: row.variantComboTokens,
    colors: parseColors(row.colors),
    priceSort: row.priceSort,
    hasPrice: row.hasPrice,
  }));

  const priceRows = rows.filter(
    (row) => matchesBrand(row, query) && matchesColorAndSize(row, query.colors, query.sizes),
  );
  const brandRows = rows.filter(
    (row) => matchesColorAndSize(row, query.colors, query.sizes) && matchesPrice(row, query),
  );
  const colorRows = rows.filter(
    (row) => matchesBrand(row, query) && matchesColorAndSize(row, [], query.sizes) && matchesPrice(row, query),
  );
  const sizeRows = rows.filter(
    (row) => matchesBrand(row, query) && matchesColorAndSize(row, query.colors, []) && matchesPrice(row, query),
  );

  return {
    colors: aggregateListingColors(colorRows),
    sizes: aggregateListingSizes(sizeRows),
    brands: aggregateListingBrands(brandRows),
    priceRange: {
      ...boundsFromRows(priceRows),
      stepSize,
      stepSizePerCurrency,
    },
  };
}

function boundsFromRows(rows: ListingFacetRow[]) {
  let min = Infinity;
  let max = 0;
  for (const row of rows) {
    if (!row.hasPrice) continue;
    if (row.priceSort < min) min = row.priceSort;
    if (row.priceSort > max) max = row.priceSort;
  }
  if (min === Infinity || max <= 0) {
    return { min: 0, max: 0, hasProducts: false };
  }
  return { min, max, hasProducts: true };
}

function aggregateListingBrands(rows: ListingFacetRow[]) {
  const map = new Map<string, { id: string; name: string; count: number }>();
  for (const row of rows) {
    if (!row.brandId || !row.brandName?.trim()) continue;
    const existing = map.get(row.brandId);
    map.set(row.brandId, {
      id: row.brandId,
      name: row.brandName.trim(),
      count: (existing?.count ?? 0) + 1,
    });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function aggregateListingColors(rows: ListingFacetRow[]) {
  const map = new Map<string, { value: string; label: string; count: number; imageUrl?: string | null; colors?: string[] | null }>();
  for (const row of rows) {
    const seen = new Set<string>();
    for (const color of row.colors) {
      const value = color.value.trim().toLowerCase();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      const existing = map.get(value);
      map.set(value, {
        value,
        label: color.label || existing?.label || value,
        count: (existing?.count ?? 0) + 1,
        imageUrl: color.imageUrl || existing?.imageUrl || null,
        colors: color.colors || existing?.colors || null,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function aggregateListingSizes(rows: ListingFacetRow[]) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const seen = new Set<string>();
    for (const token of row.sizeTokens) {
      if (!token || seen.has(token)) continue;
      seen.add(token);
      map.set(token, (map.get(token) ?? 0) + 1);
    }
  }
  const sizes = [...map.entries()].map(([value, count]) => ({ value, count }));
  sizes.sort((a, b) => {
    const aIndex = CATALOG_SIZE_ORDER.indexOf(a.value as (typeof CATALOG_SIZE_ORDER)[number]);
    const bIndex = CATALOG_SIZE_ORDER.indexOf(b.value as (typeof CATALOG_SIZE_ORDER)[number]);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.value.localeCompare(b.value);
  });
  return sizes;
}
