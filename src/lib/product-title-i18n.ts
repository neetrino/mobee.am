import type { LanguageCode } from './language';
import { containsArmenianScript } from './pickCategoryTranslation';

type ProductTitlePrefixBundle = {
  hy: string;
  en: string;
  ru: string;
};

/**
 * Leading type words in imported product titles (often Armenian under every locale).
 * Singular EN/RU forms — these prefix a model name, not a category list label.
 */
const PRODUCT_TITLE_PREFIX_BUNDLES: readonly ProductTitlePrefixBundle[] = [
  { hy: 'Լվացքի մեքենա', en: 'Washing machine', ru: 'Стиральная машина' },
  { hy: 'Սառնարան', en: 'Refrigerator', ru: 'Холодильник' },
  { hy: 'Օդորակիչ', en: 'Air conditioner', ru: 'Кондиционер' },
  { hy: 'Հեռուստացույց', en: 'TV', ru: 'Телевизор' },
  { hy: 'Վարսահարդարիչ', en: 'Hair dryer', ru: 'Фен' },
  { hy: 'Մազերի ուղղիչ', en: 'Hair straightener', ru: 'Выпрямитель' },
  { hy: 'Խաղային կոնսոլ', en: 'Game console', ru: 'Игровая консоль' },
  { hy: 'Ականջակալ', en: 'Headphones', ru: 'Наушники' },
  { hy: 'Հեռախոս', en: 'Phone', ru: 'Телефон' },
  { hy: 'Պլանշետ', en: 'Tablet', ru: 'Планшет' },
  { hy: 'Համակարգիչ', en: 'Computer', ru: 'Компьютер' },
  { hy: 'Ժամացույց', en: 'Watch', ru: 'Часы' },
  { hy: 'Աքսեսուար', en: 'Accessory', ru: 'Аксессуар' },
] as const;

const PRODUCT_TITLE_PREFIXES_BY_LENGTH = [...PRODUCT_TITLE_PREFIX_BUNDLES].sort(
  (a, b) => b.hy.length - a.hy.length,
);

function isLanguageCode(value: string): value is LanguageCode {
  return value === 'hy' || value === 'en' || value === 'ru' || value === 'ka';
}

function pickPrefixLabel(bundle: ProductTitlePrefixBundle, lang: LanguageCode): string {
  if (lang === 'ru') {
    return bundle.ru;
  }
  if (lang === 'en' || lang === 'ka') {
    return bundle.en;
  }
  return bundle.hy;
}

/**
 * Localize a product card/PDP title for the active UI language.
 * Replaces a known Armenian type prefix when EN/RU rows still store Armenian copy.
 * Unknown titles (and Latin brand/model names) are returned unchanged.
 */
export function localizeProductTitle(title: string, langInput: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    return '';
  }

  const lang: LanguageCode = isLanguageCode(langInput) ? langInput : 'en';
  if (lang === 'hy' || !containsArmenianScript(trimmed)) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();
  for (const bundle of PRODUCT_TITLE_PREFIXES_BY_LENGTH) {
    const prefix = bundle.hy.toLowerCase();
    if (!lower.startsWith(prefix)) {
      continue;
    }
    const rest = trimmed.slice(bundle.hy.length).trimStart();
    const localizedPrefix = pickPrefixLabel(bundle, lang);
    return rest ? `${localizedPrefix} ${rest}` : localizedPrefix;
  }

  return trimmed;
}
