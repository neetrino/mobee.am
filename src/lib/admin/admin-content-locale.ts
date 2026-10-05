import { APP_LOCALES, type AppLocale, DEFAULT_APP_LOCALE } from '@/lib/i18n/routing';

/** Catalog content locales editable in admin (hy / en / ru). */
export const ADMIN_CONTENT_LOCALES = APP_LOCALES;

export type AdminContentLocale = AppLocale;

export const DEFAULT_ADMIN_CONTENT_LOCALE: AdminContentLocale = DEFAULT_APP_LOCALE;

export const ADMIN_CONTENT_LOCALE_STORAGE_KEY = 'admin_content_locale';

/** Full labels for translation tabs (screenshot-style). */
export const ADMIN_CONTENT_LOCALE_FULL_LABELS: Record<AdminContentLocale, string> = {
  hy: 'Հայերեն',
  en: 'English',
  ru: 'Русский',
};

/** Compact labels (lists / badges). */
export const ADMIN_CONTENT_LOCALE_LABELS: Record<AdminContentLocale, string> = {
  hy: 'ՀԱՅ',
  en: 'EN',
  ru: 'RU',
};

export type AdminLocaleTextMap = Record<AdminContentLocale, string>;

/**
 * Empty hy/en/ru text map for form state.
 */
export function emptyAdminLocaleTextMap(): AdminLocaleTextMap {
  return {
    hy: '',
    en: '',
    ru: '',
  };
}

/**
 * Parse an unknown value into a valid admin content locale.
 */
export function parseAdminContentLocale(
  value: string | null | undefined,
  fallback: AdminContentLocale = DEFAULT_ADMIN_CONTENT_LOCALE,
): AdminContentLocale {
  if (value === 'hy' || value === 'en' || value === 'ru') {
    return value;
  }
  return fallback;
}

/**
 * Read locale from URLSearchParams (`?locale=`).
 */
export function localeFromSearchParams(
  searchParams: URLSearchParams,
  fallback: AdminContentLocale = DEFAULT_ADMIN_CONTENT_LOCALE,
): AdminContentLocale {
  return parseAdminContentLocale(searchParams.get('locale'), fallback);
}

/**
 * Build a locale→text map from translation rows.
 */
export function localeTextMapFromRows(
  rows: Array<{ locale: string; value: string }> | undefined,
): AdminLocaleTextMap {
  const map = emptyAdminLocaleTextMap();
  if (!rows) {
    return map;
  }
  for (const row of rows) {
    if (row.locale === 'hy' || row.locale === 'en' || row.locale === 'ru') {
      map[row.locale] = row.value;
    }
  }
  return map;
}

/**
 * Non-empty locale entries for API writes (skips blank strings).
 */
export function filledLocaleEntries(
  map: AdminLocaleTextMap,
): Array<{ locale: AdminContentLocale; value: string }> {
  return ADMIN_CONTENT_LOCALES.flatMap((locale) => {
    const value = map[locale].trim();
    if (!value) {
      return [];
    }
    return [{ locale, value }];
  });
}
