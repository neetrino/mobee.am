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
import { getStoredLanguage, syncLanguageCookieFromStorage } from '../lib/language';

type CategoriesTreeContextValue = {
  categories: CategoryTreeNode[];
  loadingCategories: boolean;
  refetchCategories: () => Promise<void>;
};

const CategoriesTreeContext = createContext<CategoriesTreeContextValue | null>(null);

interface CategoriesResponse {
  data: CategoryTreeNode[];
}

/**
 * Single shared fetch for `/api/v1/categories/tree` (header + home strip).
 */
export function CategoriesTreeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [categories, setCategories] = useState<CategoryTreeNode[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

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
    void refetchCategories();
  }, [refetchCategories]);

  useEffect(() => {
    const onLang = () => void refetchCategories();
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
