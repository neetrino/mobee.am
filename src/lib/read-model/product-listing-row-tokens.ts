import type { Prisma } from "@white-shop/db";
import type { CatalogOptionLike } from "@/lib/catalog/variant-option-where";
import {
  catalogOptionColorValue,
  catalogOptionSizeValue,
} from "@/lib/catalog/variant-option-where";
import { CATALOG_ATTRIBUTE_COLOR, CATALOG_ATTRIBUTE_SIZE } from "@/lib/catalog/catalog.constants";

export type ListingColorFacetValue = {
  value: string;
  label: string;
  imageUrl?: string | null;
  colors?: string[] | null;
};

function uniqueTokens(tokens: string[]): string[] {
  return [...new Set(tokens.filter(Boolean))];
}

function optionKey(option: CatalogOptionLike): string {
  const fromValue = option.attributeValue?.attribute?.key;
  return (fromValue || option.attributeKey || option.key || option.attribute || "")
    .trim()
    .toLowerCase();
}

function collectColorTokensFromOption(option: CatalogOptionLike, locale: string): string[] {
  if (optionKey(option) !== CATALOG_ATTRIBUTE_COLOR) {
    return [];
  }
  const tokens: string[] = [];
  const display = catalogOptionColorValue(option, locale);
  if (display) tokens.push(display);
  const canonical = option.attributeValue?.value?.trim().toLowerCase();
  if (canonical) tokens.push(canonical);
  const raw = option.value?.trim().toLowerCase();
  if (raw) tokens.push(raw);
  for (const translation of option.attributeValue?.translations ?? []) {
    const label = translation.label?.trim().toLowerCase();
    if (label) tokens.push(label);
  }
  return tokens;
}

function collectSizeTokensFromOption(option: CatalogOptionLike, locale: string): string[] {
  if (optionKey(option) !== CATALOG_ATTRIBUTE_SIZE) {
    return [];
  }
  const tokens: string[] = [];
  const display = catalogOptionSizeValue(option, locale);
  if (display) tokens.push(display);
  const canonical = option.attributeValue?.value?.trim().toUpperCase();
  if (canonical) tokens.push(canonical);
  const raw = option.value?.trim().toUpperCase();
  if (raw) tokens.push(raw);
  return tokens;
}

export function collectListingColorTokens(
  options: CatalogOptionLike[] | undefined,
  locale: string,
): string[] {
  const tokens: string[] = [];
  for (const option of options ?? []) {
    tokens.push(...collectColorTokensFromOption(option, locale));
  }
  return uniqueTokens(tokens);
}

export function collectListingSizeTokens(
  options: CatalogOptionLike[] | undefined,
  locale: string,
): string[] {
  const tokens: string[] = [];
  for (const option of options ?? []) {
    tokens.push(...collectSizeTokensFromOption(option, locale));
  }
  return uniqueTokens(tokens);
}

function comboToken(color: string, size: string): string {
  return `c:${color}|s:${size}`;
}

/**
 * Same-variant color×size pairs so PLP AND filters never match across variants.
 */
export function collectListingComboTokens(
  variants: Array<{ options?: CatalogOptionLike[] | null }> | undefined,
  locale: string,
): string[] {
  const tokens: string[] = [];
  for (const variant of variants ?? []) {
    const colors = collectListingColorTokens(variant.options ?? [], locale);
    const sizes = collectListingSizeTokens(variant.options ?? [], locale);
    if (colors.length === 0 || sizes.length === 0) continue;
    for (const color of colors) {
      for (const size of sizes) {
        tokens.push(comboToken(color, size));
      }
    }
  }
  return uniqueTokens(tokens);
}

export function listingColorSizeComboTokens(colors: string[], sizes: string[]): string[] {
  return uniqueTokens(
    colors.flatMap((color) => sizes.map((size) => comboToken(color, size))),
  );
}

export function collectListingColorFacets(
  options: CatalogOptionLike[] | undefined,
  locale: string,
): ListingColorFacetValue[] {
  const map = new Map<string, ListingColorFacetValue>();
  for (const option of options ?? []) {
    const value = catalogOptionColorValue(option, locale);
    if (!value || map.has(value)) continue;
    const label =
      option.attributeValue?.translations?.find((row) => row.locale === locale)?.label?.trim() ||
      option.attributeValue?.value?.trim() ||
      option.value?.trim() ||
      value;
    const colors = Array.isArray(option.attributeValue?.colors)
      ? (option.attributeValue?.colors as string[])
      : null;
    map.set(value, {
      value,
      label,
      imageUrl: option.attributeValue?.imageUrl ?? null,
      colors,
    });
  }
  return [...map.values()];
}

export function buildListingSearchText(parts: Array<string | null | undefined>): string {
  return uniqueTokens(
    parts
      .map((part) => part?.trim().toLowerCase())
      .filter((part): part is string => Boolean(part)),
  ).join(" ");
}

export type ListingRowWhereInput = Prisma.ProductListingRowWhereInput;
