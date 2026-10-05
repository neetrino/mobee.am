import type { ProductDiscountContext } from "@/lib/services/products-find-transform.service";
import { CATALOG_SIZE_ORDER } from "./catalog.constants";
import {
  aggregateAttributeFacetEntries,
  collectAttributeFacetEntries,
} from "./catalog-attribute-facets";
import { preferredLabel } from "./catalog-facet-label";
import type { CatalogLightRow } from "./catalog-light.types";
import { catalogListingPrice } from "./catalog-price";
import {
  catalogOptionColorLabel,
  catalogOptionColorValue,
  catalogOptionSizeValue,
  type CatalogOptionLike,
} from "./variant-option-where";

export type CatalogColorFacet = {
  value: string;
  label: string;
  count: number;
  imageUrl?: string | null;
  colors?: string[] | null;
};

export type CatalogSizeFacet = { value: string; count: number };
export type CatalogBrandFacet = { id: string; name: string; count: number };

export type CatalogAttributeValueFacet = {
  value: string;
  label: string;
  count: number;
};

export type CatalogAttributeFacet = {
  key: string;
  name: string;
  position: number;
  values: CatalogAttributeValueFacet[];
};

export type CatalogAttributeMeta = {
  key: string;
  name: string;
  position: number;
  filterable: boolean;
};

export type CatalogPriceBounds = {
  min: number;
  max: number;
  hasProducts: boolean;
};

function brandName(row: CatalogLightRow, lang: string): string {
  const translations = row.brand?.translations ?? [];
  const match =
    translations.find((item) => item.locale === lang)?.name ||
    translations[0]?.name ||
    row.brand?.name ||
    "";
  return match.trim();
}

export function computeCatalogPriceBounds(
  rows: CatalogLightRow[],
  discounts: ProductDiscountContext,
): CatalogPriceBounds {
  let min = Infinity;
  let max = 0;
  for (const row of rows) {
    const price = catalogListingPrice(row, discounts);
    if (price === null) continue;
    if (price < min) min = price;
    if (price > max) max = price;
  }
  if (min === Infinity || max <= 0) {
    return { min: 0, max: 0, hasProducts: false };
  }
  return { min, max, hasProducts: true };
}

export function aggregateBrandFacets(
  rows: CatalogLightRow[],
  lang: string,
): CatalogBrandFacet[] {
  const map = new Map<string, CatalogBrandFacet>();
  for (const row of rows) {
    const id = row.brand?.id ?? row.brandId;
    if (!id) continue;
    const name = brandName(row, lang);
    if (!name) continue;
    const existing = map.get(id);
    map.set(id, { id, name, count: (existing?.count ?? 0) + 1 });
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function forEachProductOption(
  row: CatalogLightRow,
  visit: (option: CatalogOptionLike) => void,
): void {
  for (const variant of row.variants ?? []) {
    for (const option of variant.options ?? []) {
      visit(option);
    }
  }
}

export function aggregateColorFacets(
  rows: CatalogLightRow[],
  lang: string,
): CatalogColorFacet[] {
  const map = new Map<string, CatalogColorFacet>();
  for (const row of rows) {
    const seen = new Set<string>();
    forEachProductOption(row, (option) => {
      const value = catalogOptionColorValue(option, lang);
      if (!value || seen.has(value)) return;
      seen.add(value);
      const label = catalogOptionColorLabel(option, lang) ?? value;
      const imageUrl = option.attributeValue?.imageUrl ?? null;
      const colors = Array.isArray(option.attributeValue?.colors)
        ? (option.attributeValue?.colors as string[])
        : null;
      const existing = map.get(value);
      map.set(value, {
        value,
        label: preferredLabel(existing?.label ?? "", label),
        count: (existing?.count ?? 0) + 1,
        imageUrl: imageUrl || existing?.imageUrl || null,
        colors: colors || existing?.colors || null,
      });
    });
  }
  return Array.from(map.values())
    .filter((item) => item.count > 0)
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function aggregateSizeFacets(rows: CatalogLightRow[], lang: string): CatalogSizeFacet[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const seen = new Set<string>();
    forEachProductOption(row, (option) => {
      const value = catalogOptionSizeValue(option, lang);
      if (!value || seen.has(value)) return;
      seen.add(value);
      map.set(value, (map.get(value) ?? 0) + 1);
    });
  }
  const sizes = Array.from(map.entries()).map(([value, count]) => ({ value, count }));
  sizes.sort((a, b) => {
    const aIndex = CATALOG_SIZE_ORDER.indexOf(
      a.value as (typeof CATALOG_SIZE_ORDER)[number],
    );
    const bIndex = CATALOG_SIZE_ORDER.indexOf(
      b.value as (typeof CATALOG_SIZE_ORDER)[number],
    );
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.value.localeCompare(b.value);
  });
  return sizes;
}

/**
 * Aggregate non-color/non-size attributes that appear on the candidate products.
 */
export function aggregateAttributeFacets(
  rows: CatalogLightRow[],
  lang: string,
  metaByKey: Map<string, CatalogAttributeMeta>,
): CatalogAttributeFacet[] {
  return aggregateAttributeFacetEntries(
    rows.map((row) => collectAttributeFacetEntries(row.variants ?? [], lang)),
    metaByKey,
  );
}
