import { cache } from 'react';
import { DEFAULT_APP_LOCALE, type AppLocale, asLanguageCode } from '@/lib/i18n/routing';
import type { LanguageCode } from '@/lib/language';

type LocaleHolder = {
  locale: AppLocale;
};

const getLocaleHolder = cache((): LocaleHolder => ({
  locale: DEFAULT_APP_LOCALE,
}));

/**
 * Bind the active storefront locale for this RSC request.
 * Call from `src/app/[locale]/layout.tsx` before rendering children.
 */
export function setRequestLocale(locale: AppLocale): void {
  getLocaleHolder().locale = locale;
}

export function getRequestLocale(): LanguageCode {
  return asLanguageCode(getLocaleHolder().locale);
}

export function getRequestAppLocale(): AppLocale {
  return getLocaleHolder().locale;
}
