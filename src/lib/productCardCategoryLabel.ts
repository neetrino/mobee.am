/** Minimal product row fields needed for the category line under the title. */
export type ProductCardCategorySource = {
  primaryCategoryId?: string | null;
  categories?: ReadonlyArray<{ id: string; title?: string | null }> | null;
};

/**
 * Localized category line for product cards: primary category title when set,
 * otherwise non-empty category titles joined with ", ".
 */
export function getProductCardCategoryLineLabel(product: ProductCardCategorySource): string | null {
  const categories = product.categories;
  if (!categories || categories.length === 0) {
    return null;
  }

  const titled = categories
    .map((c) => ({
      id: c.id,
      title: typeof c.title === 'string' ? c.title.trim() : '',
    }))
    .filter((c) => c.title.length > 0);

  if (titled.length === 0) {
    return null;
  }

  const primary = product.primaryCategoryId?.trim();
  if (primary) {
    const primaryMatch = titled.find((c) => c.id === primary);
    if (primaryMatch) {
      return primaryMatch.title;
    }
  }

  return titled.map((c) => c.title).join(', ');
}
