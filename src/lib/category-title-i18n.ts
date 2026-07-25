import type { LanguageCode } from './language';
import { containsArmenianScript } from './pickCategoryTranslation';

type CategoryTitleBundle = {
  hy: string;
  en: string;
  ru: string;
};

/**
 * Known storefront category titles — used when DB rows still store Armenian under `en`.
 */
const CATEGORY_TITLE_BUNDLES: readonly CategoryTitleBundle[] = [
  { hy: 'Վարսահարդարիչներ', en: 'Hair dryers', ru: 'Фены' },
  { hy: 'Վարսահարդարիչ', en: 'Hair dryer', ru: 'Фен' },
  { hy: 'Հեռախոս', en: 'Phones', ru: 'Телефоны' },
  { hy: 'Հեռախոսներ', en: 'Phones', ru: 'Телефоны' },
  { hy: 'Պլանշետ', en: 'Tablets', ru: 'Планшеты' },
  { hy: 'Պլանշետներ', en: 'Tablets', ru: 'Планшеты' },
  { hy: 'Համակարգիչ', en: 'Computers', ru: 'Компьютеры' },
  { hy: 'Համակարգիչներ', en: 'Computers', ru: 'Компьютеры' },
  { hy: 'Ժամացույց', en: 'Watches', ru: 'Часы' },
  { hy: 'Ժամացույցներ', en: 'Watches', ru: 'Часы' },
  { hy: 'Ականջակալ', en: 'Headphones', ru: 'Наушники' },
  { hy: 'Ականջակալներ', en: 'Headphones', ru: 'Наушники' },
  { hy: 'Հեռուստացույց', en: 'TVs', ru: 'Телевизоры' },
  { hy: 'Հեռուստացույցներ', en: 'TVs', ru: 'Телевизоры' },
  { hy: 'Կենցաղային տեխնիկա', en: 'Household Appliances', ru: 'Бытовая техника' },
  { hy: 'Աքսեսուար', en: 'Accessories', ru: 'Аксессуары' },
  { hy: 'Աքսեսուարներ', en: 'Accessories', ru: 'Аксессуары' },
] as const;

function normalizeCategoryTitleKey(value: string): string {
  return value.trim().toLowerCase();
}

const CATEGORY_TITLE_LOOKUP = (() => {
  const map = new Map<string, CategoryTitleBundle>();
  for (const bundle of CATEGORY_TITLE_BUNDLES) {
    map.set(normalizeCategoryTitleKey(bundle.hy), bundle);
    map.set(normalizeCategoryTitleKey(bundle.en), bundle);
    map.set(normalizeCategoryTitleKey(bundle.ru), bundle);
  }
  return map;
})();

function pickBundleTitle(bundle: CategoryTitleBundle, lang: LanguageCode): string {
  if (lang === 'ru') {
    return bundle.ru;
  }
  if (lang === 'en' || lang === 'ka') {
    return bundle.en;
  }
  return bundle.hy;
}

/**
 * Localize a category title for the active UI language.
 * Falls back to English for non-Armenian UI when the source string is Armenian.
 */
export function localizeCategoryTitle(title: string, lang: LanguageCode): string {
  const trimmed = title.trim();
  if (!trimmed) {
    return '';
  }

  const bundle = CATEGORY_TITLE_LOOKUP.get(normalizeCategoryTitleKey(trimmed));
  if (bundle) {
    return pickBundleTitle(bundle, lang);
  }

  if (lang !== 'hy' && containsArmenianScript(trimmed)) {
    return '';
  }

  return trimmed;
}
