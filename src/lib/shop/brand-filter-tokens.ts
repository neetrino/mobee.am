export type BrandFilterOption = {
  id: string;
  name: string;
};

/**
 * URL `brand` may be a DB id (checkbox) or a slug/name (home logo strip).
 */
export function brandFilterTokenMatches(
  token: string,
  brand: BrandFilterOption,
): boolean {
  const normalized = token.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (token === brand.id) {
    return true;
  }
  return normalized === brand.name.trim().toLowerCase();
}

export function isBrandFilterSelected(
  selected: string[],
  brand: BrandFilterOption,
): boolean {
  return selected.some((token) => brandFilterTokenMatches(token, brand));
}
