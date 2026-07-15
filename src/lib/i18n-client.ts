'use client';

/**
 * Client-side i18n React hook
 * This file contains React hooks that can only be used in Client Components
 */

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import {
  clientT,
  syncGetAttributeLabel,
  syncGetProductText,
} from './i18n-client-runtime';
import {
  getLazyTranslationRevision,
  preloadAdminNamespaces,
  preloadStorefrontNamespaces,
  subscribeLazyTranslations,
} from './i18n-lazy-loader';
import { type ProductField } from './i18n-types';
import { useUiLanguage } from '../components/UiLanguageProvider';

/**
 * React hook for translations in client components
 * Automatically handles language updates and memoization
 *
 * @returns Object with translation function and current language
 */
export function useTranslation() {
  const lang = useUiLanguage();
  const pathname = usePathname();
  const isAdminRoute =
    pathname?.startsWith('/supersudo') === true || pathname?.startsWith('/admin') === true;

  // Include revision in hook value deps so memoized `t(...)` callers recompute after lazy loads.
  const translationRevision = useSyncExternalStore(
    subscribeLazyTranslations,
    getLazyTranslationRevision,
    getLazyTranslationRevision,
  );

  useEffect(() => {
    void preloadStorefrontNamespaces(lang);
    if (isAdminRoute) {
      void preloadAdminNamespaces(lang);
    }
  }, [isAdminRoute, lang]);

  const translate = useCallback(
    (path: string) => {
      if (!path || typeof path !== 'string') {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[i18n] useTranslation: Invalid path provided to t()', path);
        }
        return '';
      }
      return clientT(lang, path);
    },
    [lang, translationRevision],
  );

  const getProduct = useCallback(
    (productId: string, field: ProductField) => {
      if (!productId || typeof productId !== 'string') {
        return '';
      }
      return syncGetProductText(lang, productId, field);
    },
    [lang, translationRevision],
  );

  const getAttribute = useCallback(
    (type: string, value: string) => {
      if (!type || !value || typeof type !== 'string' || typeof value !== 'string') {
        return value || '';
      }
      return syncGetAttributeLabel(lang, type, value);
    },
    [lang, translationRevision],
  );

  return useMemo(
    () => ({
      t: translate,
      lang,
      getProductText: getProduct,
      getAttributeLabel: getAttribute,
    }),
    [translate, lang, getProduct, getAttribute],
  );
}

export type { ProductField } from './i18n-types';

/**
 * Admin-only translation hook — preloads admin namespace (use inside `/supersudo` only).
 */
export function useAdminTranslation() {
  const lang = useUiLanguage();

  const translationRevision = useSyncExternalStore(
    subscribeLazyTranslations,
    getLazyTranslationRevision,
    getLazyTranslationRevision,
  );

  useEffect(() => {
    void preloadAdminNamespaces(lang);
  }, [lang]);

  const translate = useCallback(
    (path: string) => {
      if (!path || typeof path !== 'string') {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[i18n] useAdminTranslation: Invalid path provided to t()', path);
        }
        return '';
      }
      return clientT(lang, path);
    },
    [lang, translationRevision],
  );

  return useMemo(
    () => ({
      t: translate,
      lang,
    }),
    [translate, lang],
  );
}
