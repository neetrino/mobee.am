export interface ListingProductColor {
  value: string;
}

/**
 * Parses `colors` shop filter query param (comma-separated, lowercased).
 */
export function parseListingColorFilter(
  colorsParam: string | null | undefined,
): string[] {
  if (!colorsParam?.trim()) {
    return [];
  }

  return colorsParam
    .split(',')
    .map((color) => color.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Resolves which filter color to pass to PDP for a given product card.
 * Prefers a filter color that exists on the product; falls back to a single active filter.
 */
export function resolveProductCardLinkColor(
  productColors: ListingProductColor[] | undefined,
  selectedFilterColors: string[],
): string | null {
  if (selectedFilterColors.length === 0) {
    return null;
  }

  const productColorValues = new Set(
    (productColors ?? []).map((color) => color.value.toLowerCase().trim()),
  );

  const matchingFilter = selectedFilterColors.find((color) => productColorValues.has(color));
  if (matchingFilter) {
    return matchingFilter;
  }

  if (selectedFilterColors.length === 1) {
    return selectedFilterColors[0];
  }

  return null;
}
