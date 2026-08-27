import type { LanguageCode } from './language';
import { containsArmenianScript } from './pickCategoryTranslation';

type CategoryTitleBundle = {
  hy: string;
  en: string;
  ru: string;
};

/**
 * Known storefront category titles — used when DB rows still store Armenian under `en`
 * or when EN/RU translation rows exist but have empty titles.
 */
const CATEGORY_TITLE_BUNDLES: readonly CategoryTitleBundle[] = [
  { hy: 'Վարսահարդարիչներ', en: 'Hair dryers', ru: 'Фены' },
  { hy: 'Վարսահարդարիչ', en: 'Hair dryer', ru: 'Фен' },
  { hy: 'Ֆեն', en: 'Hair dryer', ru: 'Фен' },
  { hy: 'Մազերի ուղղիչ', en: 'Hair straightener', ru: 'Выпрямитель' },
  { hy: 'Մազերի ուղղիչներ', en: 'Hair straighteners', ru: 'Выпрямители' },
  { hy: 'Խաղային կոնսոլներ', en: 'Game Consoles', ru: 'Игровые консоли' },
  { hy: 'Խաղային կոնսոլ', en: 'Game Console', ru: 'Игровая консоль' },
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
  { hy: 'Լվացքի մեքենա', en: 'Washing machines', ru: 'Стиральные машины' },
  { hy: 'Լվացքի մեքենաներ', en: 'Washing machines', ru: 'Стиральные машины' },
  { hy: 'Սառնարան', en: 'Refrigerators', ru: 'Холодильники' },
  { hy: 'Սառնարաններ', en: 'Refrigerators', ru: 'Холодильники' },
  { hy: 'Օդորակիչ', en: 'Air conditioners', ru: 'Кондиционеры' },
  { hy: 'Օդորակիչներ', en: 'Air conditioners', ru: 'Кондиционеры' },
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

function isLanguageCode(value: string): value is LanguageCode {
  return value === 'hy' || value === 'en' || value === 'ru' || value === 'ka';
}

/**
 * Localize a category title for the active UI language.
 * Known titles are mapped hy/en/ru; unknown titles stay visible in the source language.
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

  return trimmed;
}

type CategoryTranslationLike = {
  locale: string;
  title?: string;
  slug?: string;
  fullPath?: string;
};

function firstNonEmptyTitle(
  translations: readonly CategoryTranslationLike[],
  localeOrder: readonly string[],
): string {
  const byLocale = new Map(translations.map((row) => [row.locale, row]));

  for (const locale of localeOrder) {
    const title = byLocale.get(locale)?.title?.trim() ?? '';
    if (title) {
      return title;
    }
  }

  for (const row of translations) {
    const title = row.title?.trim() ?? '';
    if (title) {
      return title;
    }
  }

  return '';
}

function firstUsableSlug(
  translations: readonly CategoryTranslationLike[],
  lang: LanguageCode,
): string {
  const byLocale = new Map(translations.map((row) => [row.locale, row]));
  const candidates = [
    byLocale.get(lang)?.slug,
    byLocale.get('en')?.slug,
    byLocale.get('hy')?.slug,
    ...translations.map((row) => row.slug),
  ];

  for (const slug of candidates) {
    const trimmed = slug?.trim() ?? '';
    if (!trimmed) {
      continue;
    }
    if (lang !== 'hy' && containsArmenianScript(trimmed)) {
      continue;
    }
    return trimmed;
  }

  for (const slug of candidates) {
    const trimmed = slug?.trim() ?? '';
    if (trimmed) {
      return trimmed;
    }
  }

  return '';
}

/**
 * Resolve display title/slug for a category in the active UI language.
 * Uses DB translation when valid; otherwise maps known Armenian titles via dictionary.
 */
export function resolveLocalizedCategoryFields(
  translations: readonly CategoryTranslationLike[],
  langInput: string,
): { title: string; slug: string; fullPath: string } | null {
  if (translations.length === 0) {
    return null;
  }

  const lang: LanguageCode = isLanguageCode(langInput) ? langInput : 'en';
  const byLocale = new Map(translations.map((row) => [row.locale, row]));

  const sourceTitle = firstNonEmptyTitle(translations, [lang, 'en', 'hy']);
  const localizedTitle = localizeCategoryTitle(sourceTitle, lang) || sourceTitle;
  if (!localizedTitle) {
    return null;
  }

  const slug = firstUsableSlug(translations, lang);
  if (!slug) {
    return {
      title: localizedTitle,
      slug: 'category',
      fullPath: 'category',
    };
  }
  const fullPathCandidate =
    (lang !== 'hy' &&
    byLocale.get(lang)?.fullPath &&
    !containsArmenianScript(byLocale.get(lang)?.fullPath ?? '')
      ? byLocale.get(lang)?.fullPath
      : undefined) ||
    (byLocale.get('en')?.fullPath && !containsArmenianScript(byLocale.get('en')?.fullPath ?? '')
      ? byLocale.get('en')?.fullPath
      : undefined) ||
    slug;

  return {
    title: localizedTitle,
    slug,
    fullPath: (fullPathCandidate ?? slug).trim(),
  };
}
