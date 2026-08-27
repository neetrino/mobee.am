'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { apiClient } from '../lib/api-client';
import type { CategoryTreeNode } from '../lib/category-nav';
import { getStoredLanguage, syncLanguageCookieFromStorage, type LanguageCode } from '../lib/language';
import { parseLocaleFromPathname } from '../lib/i18n/routing';
import { shouldApplyServerCategoriesSnapshot } from '../lib/i18n/provider-locale-sync';

type CategoriesTreeContextValue = {
  categories: CategoryTreeNode[];
  loadingCategories: boolean;
  refetchCategories: () => Promise<void>;
};

const CategoriesTreeContext = createContext<CategoriesTreeContextValue | null>(null);

interface CategoriesResponse {
  data: CategoryTreeNode[];
}

interface CategoriesTreeProviderProps {
  children: ReactNode;
  initialCategories?: CategoryTreeNode[];
  initialLanguage?: LanguageCode;
}

/**
 * Single shared fetch for `/api/v1/categories/tree` (header + home strip).
 */
export function CategoriesTreeProvider({
  children,
  initialCategories,
  initialLanguage,
}: CategoriesTreeProviderProps) {
  const pathname = usePathname();
  const [categories, setCategories] = useState<CategoryTreeNode[]>(() => initialCategories ?? []);
  const [loadingCategories, setLoadingCategories] = useState(() => !initialCategories);

  const refetchCategories = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (pathname?.startsWith('/supersudo')) {
      setCategories([]);
      setLoadingCategories(false);
      return;
    }
    try {
      setLoadingCategories(true);
      const lang = getStoredLanguage();
      const response = await apiClient.get<CategoriesResponse>('/api/v1/categories/tree', {
        params: { lang },
      });
      setCategories(response.data || []);
    } catch {
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }, [pathname]);

  useEffect(() => {
    syncLanguageCookieFromStorage();
  }, []);

  useEffect(() => {
    if (shouldApplyServerCategoriesSnapshot(initialCategories, initialLanguage)) {
      setCategories(initialCategories ?? []);
      setLoadingCategories(false);
      return;
    }
    void refetchCategories();
  }, [refetchCategories, initialCategories, initialLanguage]);

  useEffect(() => {
    const onLang = () => {
      if (parseLocaleFromPathname(window.location.pathname)) {
        return;
      }
      void refetchCategories();
    };
    window.addEventListener('language-updated', onLang);
    return () => window.removeEventListener('language-updated', onLang);
  }, [refetchCategories]);

  const value = useMemo(
    () => ({
      categories,
      loadingCategories,
      refetchCategories,
    }),
    [categories, loadingCategories, refetchCategories],
  );

  return (
    <CategoriesTreeContext.Provider value={value}>{children}</CategoriesTreeContext.Provider>
  );
}

export function useCategoriesTree(): CategoriesTreeContextValue {
  const ctx = useContext(CategoriesTreeContext);
  if (!ctx) {
    return {
      categories: [],
      loadingCategories: false,
      refetchCategories: async () => {},
    };
  }
  return ctx;
}
