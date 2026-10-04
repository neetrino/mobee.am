import {
  CATALOG_ATTRIBUTE_COLOR,
  CATALOG_ATTRIBUTE_SIZE,
  CATALOG_MAX_ATTR_KEYS,
  CATALOG_MAX_ATTR_VALUES_PER_KEY,
} from "./catalog.constants";
import type { CatalogOptionLike } from "./variant-option-where";

/** Selected attribute filters: key → allowed values (OR within key, AND across keys). */
export type CatalogAttrSelection = Record<string, string[]>;

const ATTR_PAIR_RE = /^([^:]+):(.+)$/;

function optionAttributeKey(option: CatalogOptionLike): string {
  const fromValue = option.attributeValue?.attribute?.key;
  const raw = fromValue || option.attributeKey || option.key || option.attribute || "";
  return raw.trim().toLowerCase();
}

function optionDisplayValue(option: CatalogOptionLike, lang: string): string {
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
 * Parse `attrs=storage:256GB,storage:512GB,ram:8GB` into a selection map.
 * Color/size keys are ignored (use dedicated `colors` / `sizes` params).
 */
export function parseCatalogAttrsParam(raw: string | undefined): CatalogAttrSelection {
  if (!raw || typeof raw !== "string") {
    return {};
  }

  const result: CatalogAttrSelection = {};
  let keyCount = 0;

  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const match = ATTR_PAIR_RE.exec(trimmed);
    if (!match) continue;

    const key = match[1].trim().toLowerCase();
    const value = match[2].trim();
    if (!key || !value) continue;
    if (key === CATALOG_ATTRIBUTE_COLOR || key === CATALOG_ATTRIBUTE_SIZE) {
      continue;
    }

    if (!result[key]) {
      if (keyCount >= CATALOG_MAX_ATTR_KEYS) {
        break;
      }
      result[key] = [];
      keyCount += 1;
    }

    if (result[key].length >= CATALOG_MAX_ATTR_VALUES_PER_KEY) {
      continue;
    }

    const dedupe = value.toLowerCase();
    if (result[key].some((item) => item.toLowerCase() === dedupe)) {
      continue;
    }
    result[key].push(value);
  }

  return result;
}

/** Serialize selection map back to a stable comma list for URLs/cache keys. */
export function serializeCatalogAttrsParam(selection: CatalogAttrSelection): string | undefined {
  const pairs: string[] = [];
  const keys = Object.keys(selection).sort((a, b) => a.localeCompare(b));
  for (const key of keys) {
    const values = [...(selection[key] ?? [])].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
    for (const value of values) {
      pairs.push(`${key}:${value}`);
    }
  }
  return pairs.length > 0 ? pairs.join(",") : undefined;
}

export function catalogAttrSelectionIsEmpty(selection: CatalogAttrSelection): boolean {
  return Object.keys(selection).every((key) => (selection[key]?.length ?? 0) === 0);
}

export function catalogOptionAttrValue(
  option: CatalogOptionLike,
  attributeKey: string,
  lang: string,
): string | null {
  if (optionAttributeKey(option) !== attributeKey.toLowerCase()) {
    return null;
  }
  const value = optionDisplayValue(option, lang);
  return value || null;
}

/**
 * Product matches when every selected attribute key has at least one matching
 * option on the same published variant (no cross-variant false positives).
 */
export function variantMatchesCatalogAttrs(
  options: CatalogOptionLike[] | undefined,
  selection: CatalogAttrSelection,
  lang: string,
): boolean {
  if (catalogAttrSelectionIsEmpty(selection)) {
    return true;
  }
  if (!options || options.length === 0) {
    return false;
  }

  for (const [key, values] of Object.entries(selection)) {
    if (!values || values.length === 0) continue;
    const wanted = new Set(values.map((item) => item.toLowerCase()));
    const hasMatch = options.some((option) => {
      const value = catalogOptionAttrValue(option, key, lang);
      return value !== null && wanted.has(value.toLowerCase());
    });
    if (!hasMatch) {
      return false;
    }
  }
  return true;
}

export function productMatchesCatalogAttrs(
  variants: Array<{ options?: CatalogOptionLike[] }> | undefined,
  selection: CatalogAttrSelection,
  lang: string,
): boolean {
  if (catalogAttrSelectionIsEmpty(selection)) {
    return true;
  }
  if (!variants || variants.length === 0) {
    return false;
  }
  return variants.some((variant) =>
    variantMatchesCatalogAttrs(variant.options, selection, lang),
  );
}
