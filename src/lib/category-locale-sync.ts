import type { LanguageCode } from './language';
import { localizeCategoryTitle } from './category-title-i18n';

const STOREFRONT_LOCALES: readonly LanguageCode[] = ['hy', 'en', 'ru'];

export type CategoryLocaleTitleWrite = {
  locale: LanguageCode;
  title: string;
};

/**
 * Կատեգորիայի վերնագրերը storefront լեզուների համար։
 * EN/RU գրում է միայն երբ կա ոչ հայերեն թարգմանություն — չի պատճենում հայերենը։
 */
export function categoryLocaleTitlesToWrite(sourceTitle: string): CategoryLocaleTitleWrite[] {
  const trimmed = sourceTitle.trim();
  if (!trimmed) {
    return [];
  }

  const writes: CategoryLocaleTitleWrite[] = [];
  for (const locale of STOREFRONT_LOCALES) {
    const localized = localizeCategoryTitle(trimmed, locale);
    if (!localized) {
      continue;
    }
    writes.push({ locale, title: localized });
  }

  if (!writes.some((row) => row.locale === 'hy')) {
    writes.unshift({ locale: 'hy', title: trimmed });
  }

  return writes;
}
