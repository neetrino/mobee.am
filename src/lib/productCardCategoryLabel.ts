import { containsArmenianScript } from './pickCategoryTranslation';
import { localizeCategoryTitle } from './category-title-i18n';
import type { LanguageCode } from './language';

/** Minimal product row fields needed for the category line under the title. */
export type ProductCardCategorySource = {
  primaryCategoryId?: string | null;
  categories?: ReadonlyArray<{ id: string; title?: string | null }> | null;
};

/**
 * Localized category line for product cards: primary category title when set,
 * otherwise non-empty category titles joined with ", ".
 */
export function getProductCardCategoryLineLabel(
  product: ProductCardCategorySource,
  language: LanguageCode = 'hy',
): string | null {
  const categories = product.categories;
  if (!categories || categories.length === 0) {
    return null;
  }

  const titled = categories
    .map((c) => {
      const raw = typeof c.title === 'string' ? c.title.trim() : '';
      const localized = localizeCategoryTitle(raw, language);
      return {
        id: c.id,
        title: localized,
      };
    })
    .filter((c) => c.title.length > 0)
    .filter((c) => language === 'hy' || !containsArmenianScript(c.title));

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
