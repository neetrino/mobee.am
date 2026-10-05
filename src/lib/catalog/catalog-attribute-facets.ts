import {
  CATALOG_ATTRIBUTE_COLOR,
  CATALOG_ATTRIBUTE_SIZE,
  CATALOG_NON_FACET_ATTRIBUTE_KEYS,
} from "./catalog.constants";
import type { CatalogLightVariant } from "./catalog-light.types";
import type { CatalogOptionLike } from "./variant-option-where";
import type { CatalogAttributeFacet, CatalogAttributeMeta } from "./catalog-facet-aggregate";
import { preferredLabel } from "./catalog-facet-label";

/** One product's distinct attribute value: `[attributeKey, displayValue]`. */
export type AttributeFacetEntry = [key: string, display: string];

type AttributeFacetVariant = Pick<CatalogLightVariant, "options" | "attributes">;

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

function humanizeAttributeKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return key;
  return trimmed
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Distinct non-color/non-size attribute values of one product, in first-seen order.
 * Variant options win over the legacy JSONB `attributes` map for the same value.
 */
export function collectAttributeFacetEntries(
  variants: readonly AttributeFacetVariant[],
  lang: string,
): AttributeFacetEntry[] {
  const seen = new Set<string>();
  const entries: AttributeFacetEntry[] = [];
  const add = (key: string, display: string) => {
    const seenKey = `${key}\u0000${display.toLowerCase()}`;
    if (seen.has(seenKey)) return;
    seen.add(seenKey);
    if (key === CATALOG_ATTRIBUTE_COLOR || key === CATALOG_ATTRIBUTE_SIZE) return;
    if (CATALOG_NON_FACET_ATTRIBUTE_KEYS.has(key)) return;
    entries.push([key, display]);
  };

  for (const variant of variants) {
    for (const option of variant.options ?? []) {
      const key = optionAttributeKey(option);
      const display = optionAttrDisplayValue(option, lang);
      if (key && display) add(key, display);
    }
  }
  for (const variant of variants) {
    for (const { key, value } of readJsonbAttributeEntries(variant.attributes)) {
      add(key, value);
    }
  }
  return entries;
}

/**
 * Validate stored `ProductListingRow.attributeFacets`; `null` means "not projected yet".
 */
export function parseAttributeFacetEntries(raw: unknown): AttributeFacetEntry[] | null {
  if (!Array.isArray(raw)) return null;
  const entries: AttributeFacetEntry[] = [];
  for (const item of raw) {
    if (
      Array.isArray(item) &&
      item.length === 2 &&
      typeof item[0] === "string" &&
      typeof item[1] === "string"
    ) {
      entries.push([item[0], item[1]]);
    }
  }
  return entries;
}

/**
 * Count products per attribute value. Any attribute used by products is shown;
 * Attribute table supplies names/order when present.
 */
export function aggregateAttributeFacetEntries(
  entriesPerProduct: readonly AttributeFacetEntry[][],
  metaByKey: Map<string, CatalogAttributeMeta>,
): CatalogAttributeFacet[] {
  type ValueAgg = { value: string; label: string; count: number };
  const byKey = new Map<string, Map<string, ValueAgg>>();

  for (const entries of entriesPerProduct) {
    for (const [key, display] of entries) {
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
    }
  }

  const facets: CatalogAttributeFacet[] = [];
  for (const [key, values] of byKey) {
    const meta = metaByKey.get(key);
    const list = Array.from(values.values()).sort((a, b) => a.label.localeCompare(b.label));
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
