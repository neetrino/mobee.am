import { DEFAULT_LANGUAGE } from './language';

type LocalizedRecord = {
  locale: string;
};

/** Armenian Unicode block (letters + punctuation used in category titles). */
const ARMENIAN_SCRIPT_RE = /[\u0530-\u058F]/;

/**
 * True when a string contains Armenian letters (e.g. «Վարսահարդարիչներ»).
 */
export function containsArmenianScript(value: string): boolean {
  return ARMENIAN_SCRIPT_RE.test(value);
}

function translationHasArmenianCopy(row: LocalizedRecord): boolean {
  for (const value of Object.values(row)) {
    if (typeof value === 'string' && containsArmenianScript(value)) {
      return true;
    }
  }
  return false;
}

function isUsableTranslation<T extends LocalizedRecord>(row: T | undefined, lang: string): row is T {
  if (!row) {
    return false;
  }
  if (lang === 'hy') {
    return true;
  }
  return !translationHasArmenianCopy(row);
}

/**
 * Resolves the best category translation for the requested storefront language.
 * Never injects Armenian copy into a non-Armenian UI (missing locale or hy text stored under `en`).
 */
export function pickCategoryTranslation<T extends LocalizedRecord>(
  translations: T[],
  lang: string,
): T | undefined {
  if (translations.length === 0) {
    return undefined;
  }

  const byLocale = new Map(translations.map((translation) => [translation.locale, translation]));
  const preferredLocales =
    lang === 'hy' || lang === DEFAULT_LANGUAGE
      ? [lang, 'en', DEFAULT_LANGUAGE]
      : [lang, 'en'];

  for (const locale of preferredLocales) {
    const row = byLocale.get(locale);
    if (isUsableTranslation(row, lang)) {
      return row;
    }
  }

  if (lang === 'hy' || lang === DEFAULT_LANGUAGE) {
    return translations[0];
  }

  return translations.find((row) => isUsableTranslation(row, lang));
}
