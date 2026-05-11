'use client';

/**
 * React hooks for i18n - client-side only
 * This file is separated from i18n.ts to allow server-side usage of t() function
 */

import { useMemo, useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { type LanguageCode, DEFAULT_LANGUAGE, getStoredLanguage } from './language';
import { subscribeLanguageStore } from './useClientSyncedLanguage';
import { t, getProductText, getAttributeLabel, clearTranslationCache, type ProductField } from './i18n';

// Import translations to check if language is available
import enCommon from '../locales/en/common.json';
import hyCommon from '../locales/hy/common.json';
import ruCommon from '../locales/ru/common.json';

const translations: Partial<Record<LanguageCode, any>> = {
  en: { common: enCommon },
  hy: { common: hyCommon },
  ru: { common: ruCommon },
};

function getTranslationLanguageSnapshot(): LanguageCode {
  const stored = getStoredLanguage();
  return stored && stored in translations ? stored : DEFAULT_LANGUAGE;
}

function getServerTranslationLanguageSnapshot(): LanguageCode {
  return DEFAULT_LANGUAGE;
}

/**
 * React hook for translations in client components
 * Automatically handles language updates and memoization
 * 
 * @returns Object with translation function and current language
 * 
 * @example
 * ```tsx
 * const { t, lang } = useTranslation();
 * return <button>{t('common.buttons.addToCart')}</button>;
 * ```
 */
export function useTranslation() {
  const lang = useSyncExternalStore(
    subscribeLanguageStore,
    getTranslationLanguageSnapshot,
    getServerTranslationLanguageSnapshot,
  );

  const prevLangRef = useRef<LanguageCode | undefined>(undefined);
  useEffect(() => {
    if (prevLangRef.current !== undefined && prevLangRef.current !== lang) {
      clearTranslationCache();
    }
    prevLangRef.current = lang;
  }, [lang]);

  // Memoized translation function with validation
  const translate = useCallback(
    (path: string) => {
      if (!path || typeof path !== 'string') {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[i18n] useTranslation: Invalid path provided to t()', path);
        }
        return '';
      }
      return t(lang, path);
    },
    [lang]
  );

  // Memoized product text getter
  const getProduct = useCallback(
    (productId: string, field: ProductField) => {
      if (!productId || typeof productId !== 'string') {
        return '';
      }
      return getProductText(lang, productId, field);
    },
    [lang]
  );

  // Memoized attribute label getter
  const getAttribute = useCallback(
    (type: string, value: string) => {
      if (!type || !value || typeof type !== 'string' || typeof value !== 'string') {
        return value || '';
      }
      return getAttributeLabel(lang, type, value);
    },
    [lang]
  );

  return useMemo(
    () => ({
      t: translate,
      lang,
      getProductText: getProduct,
      getAttributeLabel: getAttribute,
    }),
    [translate, lang, getProduct, getAttribute]
  );
}



