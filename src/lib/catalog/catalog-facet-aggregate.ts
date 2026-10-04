import type { ProductDiscountContext } from "@/lib/services/products-find-transform.service";
import {
  CATALOG_ATTRIBUTE_COLOR,
  CATALOG_ATTRIBUTE_SIZE,
  CATALOG_SIZE_ORDER,
} from "./catalog.constants";
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

function preferredLabel(current: string, incoming: string): string {
  if (!current) return incoming;
  const currentUpper = current[0] === current[0]?.toUpperCase();
  const incomingUpper = incoming[0] === incoming[0]?.toUpperCase();
  if (incomingUpper && !currentUpper) return incoming;
  return current;
}

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

function optionAttributeKey(option: CatalogOptionLike): string {
  const fromValue = option.attributeValue?.attribute?.key;
  const raw = fromValue || option.attributeKey || option.key || option.attribute || "";
  return raw.trim().toLowerCase();
}

function optionAttrDisplayValue(option: CatalogOptionLike, lang: string): string {
  if (option.attributeValue) {
    const translations = option.attributeValue.translations ?? [];
    const match =
      translations.find((row) => row.locale === lang) ?? translations[0];
    const label = match?.label?.trim() ?? "";
    const value = option.attributeValue.value?.trim() ?? "";
    return label || value;
  }
  return (option.value || option.label || "").trim();
}

/**
 * Aggregate non-color/non-size attributes that appear on the candidate products.
 * Any attribute used by products is shown; Attribute table supplies names/order when present.
 */
export function aggregateAttributeFacets(
  rows: CatalogLightRow[],
  lang: string,
  metaByKey: Map<string, CatalogAttributeMeta>,
): CatalogAttributeFacet[] {
  type ValueAgg = { value: string; label: string; count: number };
  const byKey = new Map<string, Map<string, ValueAgg>>();

  const bump = (key: string, display: string) => {
    if (!key || !display) return;
    if (key === CATALOG_ATTRIBUTE_COLOR || key === CATALOG_ATTRIBUTE_SIZE) return;
    const valueKey = display.toLowerCase();
    let values = byKey.get(key);
    if (!values) {
      values = new Map();
      byKey.set(key, values);
    }
    const existing = values.get(valueKey);
    values.set(valueKey, {
      value: existing?.value ?? display,
      label: preferredLabel(existing?.label ?? "", display),
      count: (existing?.count ?? 0) + 1,
    });
  };

  for (const row of rows) {
    const seenPerKey = new Map<string, Set<string>>();
    const markSeen = (key: string, display: string): boolean => {
      const valueKey = display.toLowerCase();
      let seen = seenPerKey.get(key);
      if (!seen) {
        seen = new Set();
        seenPerKey.set(key, seen);
      }
      if (seen.has(valueKey)) return false;
      seen.add(valueKey);
      return true;
    };

    forEachProductOption(row, (option) => {
      const key = optionAttributeKey(option);
      const display = optionAttrDisplayValue(option, lang);
      if (!key || !display) return;
      if (!markSeen(key, display)) return;
      bump(key, display);
    });

    for (const variant of row.variants ?? []) {
      for (const { key, value } of readJsonbAttributeEntries(variant.attributes)) {
        if (!markSeen(key, value)) continue;
        bump(key, value);
      }
    }
  }

  const facets: CatalogAttributeFacet[] = [];
  for (const [key, values] of byKey) {
    const meta = metaByKey.get(key);
    const list = Array.from(values.values())
      .filter((item) => item.count > 0)
      .sort((a, b) => a.label.localeCompare(b.label));
    if (list.length === 0) continue;
    facets.push({
      key,
      name: meta?.name || humanizeAttributeKey(key),
      position: meta?.position ?? Number.MAX_SAFE_INTEGER,
      values: list,
    });
  }

  return facets.sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return a.name.localeCompare(b.name);
  });
}

function humanizeAttributeKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return key;
  return trimmed
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function readJsonbAttributeEntries(
  raw: unknown,
): Array<{ key: string; value: string }> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return [];
  }
  const out: Array<{ key: string; value: string }> = [];
  for (const [rawKey, rawValue] of Object.entries(raw as Record<string, unknown>)) {
    const key = rawKey.trim().toLowerCase();
    if (!key) continue;
    if (typeof rawValue === "string" && rawValue.trim()) {
      out.push({ key, value: rawValue.trim() });
      continue;
    }
    if (!Array.isArray(rawValue)) continue;
    for (const item of rawValue) {
      if (typeof item === "string" && item.trim()) {
        out.push({ key, value: item.trim() });
        continue;
      }
      if (item && typeof item === "object" && "value" in item) {
        const value = String((item as { value: unknown }).value ?? "").trim();
        if (value) out.push({ key, value });
      }
    }
  }
  return out;
}
