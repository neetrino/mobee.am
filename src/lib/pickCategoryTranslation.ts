import { DEFAULT_LANGUAGE } from './language';

type LocalizedRecord = {
  locale: string;
};

/**
 * Resolves the best category translation for the requested storefront language.
 */
export function pickCategoryTranslation<T extends LocalizedRecord>(
  translations: T[],
  lang: string,
): T | undefined {
  if (translations.length === 0) {
    return undefined;
  }

  const byLocale = new Map(translations.map((translation) => [translation.locale, translation]));

  return (
    byLocale.get(lang) ??
    byLocale.get(DEFAULT_LANGUAGE) ??
    byLocale.get('en') ??
    translations[0]
  );
}
