'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  type LanguageCode,
  getStoredLanguage,
  persistLanguageCookie,
} from '../lib/language';
import { clearTranslationCache } from '../lib/i18n';

const UiLanguageContext = createContext<LanguageCode | null>(null);

/**
 * Keeps UI language in sync with SSR: initial value comes from `shop_language` cookie
 * (see root layout) so the first client render matches the server HTML. After mount,
 * localStorage wins if it differs, and `language-updated` keeps all consumers aligned.
 */
export function UiLanguageProvider({
  children,
  initialLanguage,
}: {
  children: ReactNode;
  initialLanguage: LanguageCode;
}) {
  const [lang, setLang] = useState<LanguageCode>(initialLanguage);

  useEffect(() => {
    setLang((current) => {
      const stored = getStoredLanguage();
      if (stored === current) return current;
      clearTranslationCache();
      persistLanguageCookie(stored);
      return stored;
    });
  }, []);

  useEffect(() => {
    const handleLanguageUpdate = () => {
      const next = getStoredLanguage();
      setLang((prev) => {
        if (next === prev) return prev;
        clearTranslationCache();
        return next;
      });
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
