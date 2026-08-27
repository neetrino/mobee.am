'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { type LanguageCode, getStoredLanguage, persistLanguageCookie } from '../lib/language';
import { parseLocaleFromPathname } from '../lib/i18n/routing';
import { seedStorefrontLocale } from '../lib/i18n-lazy-loader';

const UiLanguageContext = createContext<LanguageCode | null>(null);

/**
 * Storefront: URL locale (`/[locale]/...`) is the source of truth.
 * Admin: falls back to cookie/localStorage via `language-updated`.
 */
export function UiLanguageProvider({
  children,
  initialLanguage,
}: {
  children: ReactNode;
  initialLanguage: LanguageCode;
}) {
  const pathname = usePathname();
  const urlLocale = parseLocaleFromPathname(pathname ?? '');
  const [adminLang, setAdminLang] = useState<LanguageCode>(initialLanguage);
  const lang = urlLocale ?? adminLang;

  seedStorefrontLocale(lang);

  useEffect(() => {
    if (urlLocale) {
      persistLanguageCookie(urlLocale);
      return;
    }
    const stored = getStoredLanguage();
    if (stored === adminLang) {
      return;
    }
    seedStorefrontLocale(stored);
    persistLanguageCookie(stored);
    setAdminLang(stored);
  }, [adminLang, urlLocale]);

  useEffect(() => {
    const handleLanguageUpdate = (): void => {
      if (parseLocaleFromPathname(window.location.pathname)) {
        return;
      }
      const next = getStoredLanguage();
      if (next === adminLang) {
        return;
      }
      seedStorefrontLocale(next);
      persistLanguageCookie(next);
      setAdminLang(next);
    };

    window.addEventListener('language-updated', handleLanguageUpdate);
    return () => window.removeEventListener('language-updated', handleLanguageUpdate);
  }, [adminLang]);

  const value = useMemo(() => lang, [lang]);

  return <UiLanguageContext.Provider value={value}>{children}</UiLanguageContext.Provider>;
}

export function useUiLanguage(): LanguageCode {
  const ctx = useContext(UiLanguageContext);
  if (ctx === null) {
    throw new Error('useUiLanguage must be used within UiLanguageProvider');
  }
  return ctx;
}
