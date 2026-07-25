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
import { useRouter } from 'next/navigation';
import {
  type LanguageCode,
  getStoredLanguage,
  persistLanguageCookie,
} from '../lib/language';
import {
  clearLazyTranslationStore,
  seedStorefrontLocale,
} from '../lib/i18n-lazy-loader';

const UiLanguageContext = createContext<LanguageCode | null>(null);

/**
 * Keeps UI language in sync with SSR: initial value comes from `shop_language` cookie
 * (see root layout) so the first client render matches the server HTML. After mount,
 * localStorage wins if it differs, and `language-updated` keeps all consumers aligned.
 *
 * Clear/seed must happen *before* `setLang`, never inside a setState updater and never
 * in a later effect after children already started `preloadStorefrontNamespaces` —
 * otherwise lazy namespaces load then get wiped, and strings only appear after another toggle.
 *
 * `router.refresh()` re-runs home RSC (category strip / product rows) with the new cookie —
 * client-only state was leaving Armenian SSR payloads until a full page reload.
 */
export function UiLanguageProvider({
  children,
  initialLanguage,
}: {
  children: ReactNode;
  initialLanguage: LanguageCode;
}) {
  const router = useRouter();
  const [lang, setLang] = useState<LanguageCode>(initialLanguage);
  const langRef = useRef(lang);

  // Sync seed only (no listener notify) so translations exist before paint.
  seedStorefrontLocale(lang);

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  useEffect(() => {
    const stored = getStoredLanguage();
    if (stored === initialLanguage) {
      return;
    }
    clearLazyTranslationStore();
    seedStorefrontLocale(stored);
    persistLanguageCookie(stored);
    setLang(stored);
    router.refresh();
  }, [initialLanguage, router]);

  useEffect(() => {
    const handleLanguageUpdate = () => {
      const next = getStoredLanguage();
      if (next === langRef.current) {
        return;
      }
      clearLazyTranslationStore();
      seedStorefrontLocale(next);
      persistLanguageCookie(next);
      setLang(next);
      router.refresh();
    };

    window.addEventListener('language-updated', handleLanguageUpdate);
    return () => window.removeEventListener('language-updated', handleLanguageUpdate);
  }, [router]);

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
