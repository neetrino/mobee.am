export interface ListingProductColor {
  value: string;
  /** Canonical variant color token for PDP URLs (falls back to `value`). */
  linkValue?: string;
  imageUrl?: string | null;
}

function normalizeListingColorToken(color: string): string {
  return color.trim().toLowerCase();
}

export function resolveListingColorLinkValue(color: ListingProductColor): string {
  return normalizeListingColorToken(color.linkValue ?? color.value);
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
    (productColors ?? []).map((color) => resolveListingColorLinkValue(color)),
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
