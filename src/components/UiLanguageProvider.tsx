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
 * Important: never call `clearLazyTranslationStore()` inside a `setState` updater —
 * React may run updaters during render, and clearing notifies `useSyncExternalStore`
 * subscribers (e.g. SearchDropdown) which would setState in another component mid-render.
 */
export function UiLanguageProvider({
  children,
  initialLanguage,
}: {
  children: ReactNode;
  initialLanguage: LanguageCode;
}) {
  const [lang, setLang] = useState<LanguageCode>(initialLanguage);
  const isFirstLangEffectRef = useRef(true);

  // Sync seed only (no listener notify) so translations exist before paint.
  seedStorefrontLocale(lang);

  useEffect(() => {
    const stored = getStoredLanguage();
    if (stored === initialLanguage) {
      return;
    }
    setLang(stored);
    persistLanguageCookie(stored);
  }, [initialLanguage]);

  useEffect(() => {
    const handleLanguageUpdate = () => {
      const next = getStoredLanguage();
      setLang((prev) => (next === prev ? prev : next));
    };

    window.addEventListener('language-updated', handleLanguageUpdate);
    return () => window.removeEventListener('language-updated', handleLanguageUpdate);
  }, []);

  useEffect(() => {
    if (isFirstLangEffectRef.current) {
      isFirstLangEffectRef.current = false;
      seedStorefrontLocale(lang);
      return;
    }

    clearLazyTranslationStore();
    seedStorefrontLocale(lang);
    persistLanguageCookie(lang);
  }, [lang]);

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
