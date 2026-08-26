'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { type LanguageCode, getStoredLanguage, persistLanguageCookie } from '../lib/language';
import { parseLocaleFromPathname } from '../lib/i18n/routing';
import { clearLazyTranslationStore, seedStorefrontLocale } from '../lib/i18n-lazy-loader';

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
  const [lang, setLang] = useState<LanguageCode>(initialLanguage);
  const langRef = useRef(lang);

  seedStorefrontLocale(lang);

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  useEffect(() => {
    if (initialLanguage === langRef.current) {
      return;
    }
    clearLazyTranslationStore();
    seedStorefrontLocale(initialLanguage);
    setLang(initialLanguage);
  }, [initialLanguage]);

  useEffect(() => {
    if (urlLocale) {
      persistLanguageCookie(urlLocale);
      return;
    }
    const stored = getStoredLanguage();
    if (stored === langRef.current) {
      return;
    }
    clearLazyTranslationStore();
    seedStorefrontLocale(stored);
    persistLanguageCookie(stored);
    setLang(stored);
  }, [urlLocale]);

  useEffect(() => {
    const handleLanguageUpdate = () => {
      if (parseLocaleFromPathname(window.location.pathname)) {
        return;
      }
      const next = getStoredLanguage();
      if (next === langRef.current) {
        return;
      }
      clearLazyTranslationStore();
      seedStorefrontLocale(next);
      persistLanguageCookie(next);
      setLang(next);
    };

    window.addEventListener('language-updated', handleLanguageUpdate);
    return () => window.removeEventListener('language-updated', handleLanguageUpdate);
  }, []);

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
