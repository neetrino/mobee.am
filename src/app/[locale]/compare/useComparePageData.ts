'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { MouseEvent } from 'react';
import { apiClient } from '../../../lib/api-client';
import { getStoredCurrency, type CurrencyCode } from '../../../lib/currency';
import { getStoredLanguage } from '../../../lib/language';
import type { CompareEntry } from '../../../lib/shop/compare-storage';
import {
  readCompareEntries,
  writeCompareEntries,
  getCompareProductIds,
  reconcileCompareEntriesWithProducts,
  groupCompareEntriesByResolvedCategory,
  resolveCompareCategoryId,
  COMPARE_UNCATEGORIZED_KEY,
  MAX_COMPARE_PER_CATEGORY,
} from '../../../lib/shop/compare-storage';
import type { CompareTableProduct } from './CompareGroupTable';

export interface ComparePageProduct extends CompareTableProduct {
  primaryCategoryId?: string | null;
  categories?: Array<{ id: string; slug: string; title: string }>;
}

export interface ComparePageGroup {
  sectionDomId: string;
  categoryHeading: string;
  compareSummaryLine: string;
  products: ComparePageProduct[];
}

interface FetchOptions {
  background?: boolean;
}

function resolveCategorySectionTitle(
  categoryId: string,
  sample: ComparePageProduct | undefined,
  t: (key: string) => string,
): string {
  if (categoryId === COMPARE_UNCATEGORIZED_KEY) {
    return t('common.compare.uncategorized');
  }
  const match = sample?.categories?.find((c) => c.id === categoryId);
  if (match?.title?.trim()) {
    return match.title.trim();
  }
  return t('common.compare.category');
}

function hasCompareEntries(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return readCompareEntries().length > 0;
}

export function useComparePageData(t: (key: string) => string) {
  const [products, setProducts] = useState<ComparePageProduct[]>([]);
  const [compareEntries, setCompareEntries] = useState<CompareEntry[]>([]);
  const [loading, setLoading] = useState(hasCompareEntries);
  const [currency, setCurrency] = useState<CurrencyCode>(getStoredCurrency());
  const addToCartInFlightRef = useRef<Set<string>>(new Set());
  const isLocalUpdateRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);

  const fetchCompareProducts = useCallback(
    async (entriesSnapshot: CompareEntry[], options: FetchOptions = {}) => {
      const idsToLoad = getCompareProductIds(entriesSnapshot);
      if (idsToLoad.length === 0) {
        setProducts([]);
        setLoading(false);
        hasLoadedOnceRef.current = true;
        return;
      }

      const showBlockingLoader = !options.background || !hasLoadedOnceRef.current;
      if (showBlockingLoader) {
        setLoading(true);
      }

      try {
        const languagePreference = getStoredLanguage();
        const response = await apiClient.get<{
          data: ComparePageProduct[];
          meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
          };
        }>('/api/v1/products', {
          params: {
            ids: idsToLoad.join(','),
            limit: String(Math.min(Math.max(idsToLoad.length, 1), 20)),
            lang: languagePreference,
          },
        });

        const reconciled = reconcileCompareEntriesWithProducts(response.data);
        setCompareEntries(reconciled);

        const byId = new Map(response.data.map((p) => [p.id, p]));
        const ordered = getCompareProductIds(reconciled)
          .map((id) => byId.get(id))
          .filter((p): p is ComparePageProduct => Boolean(p));
        setProducts(ordered);
        hasLoadedOnceRef.current = true;
      } catch (error) {
        console.error('[Compare] Error fetching compare products:', error);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const entries = readCompareEntries();
    setCompareEntries(entries);
    void fetchCompareProducts(entries);

    const handleCompareUpdate = () => {
      if (isLocalUpdateRef.current) {
        isLocalUpdateRef.current = false;
        return;
      }
      const updated = readCompareEntries();
      setCompareEntries(updated);
      void fetchCompareProducts(updated, { background: true });
    };

    window.addEventListener('compare-updated', handleCompareUpdate);
    return () => {
      window.removeEventListener('compare-updated', handleCompareUpdate);
    };
  }, [fetchCompareProducts]);

  useEffect(() => {
    const handleCurrencyUpdate = () => {
      setCurrency(getStoredCurrency());
    };

    const handleLanguageUpdate = () => {
      const current = readCompareEntries();
      void fetchCompareProducts(current, { background: true });
    };

    window.addEventListener('currency-updated', handleCurrencyUpdate);
    window.addEventListener('language-updated', handleLanguageUpdate);
    return () => {
      window.removeEventListener('currency-updated', handleCurrencyUpdate);
      window.removeEventListener('language-updated', handleLanguageUpdate);
    };
  }, [fetchCompareProducts]);

  const handleRemove = useCallback((e: MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();

    isLocalUpdateRef.current = true;

    const updatedEntries = readCompareEntries().filter((entry) => entry.productId !== productId);
    writeCompareEntries(updatedEntries);
    setCompareEntries(updatedEntries);
    setProducts((prev) => prev.filter((p) => p.id !== productId));

    window.dispatchEvent(new Event('compare-updated'));
  }, []);

  const groupedSections = useMemo((): ComparePageGroup[] => {
    if (products.length === 0) {
      return [];
    }

    const productById = new Map(products.map((p) => [p.id, p]));
    const groupedEntries = groupCompareEntriesByResolvedCategory(compareEntries, productById);

    return groupedEntries.flatMap((group, index) => {
      const rowProducts = group
        .map((e) => productById.get(e.productId))
        .filter((p): p is ComparePageProduct => Boolean(p));
      if (rowProducts.length === 0) {
        return [];
      }

      const categoryId = resolveCompareCategoryId(rowProducts[0]);
      const heading = resolveCategorySectionTitle(categoryId, rowProducts[0], t);
      const sectionDomId = `compare-group-${categoryId}-${index}`;

      return [
        {
          sectionDomId,
          categoryHeading: heading,
          compareSummaryLine: `${rowProducts.length}/${MAX_COMPARE_PER_CATEGORY}`,
          products: rowProducts,
        },
      ];
    });
  }, [compareEntries, products, t]);

  return {
    products,
    loading,
    currency,
    groupedSections,
    addToCartInFlightRef,
    handleRemove,
  };
}
