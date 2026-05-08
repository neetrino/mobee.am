'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MouseEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@shop/ui';
import { apiClient } from '../../lib/api-client';
import { getStoredCurrency } from '../../lib/currency';
import { getStoredLanguage } from '../../lib/language';
import { useTranslation } from '../../lib/i18n-client';
import type { CompareEntry } from '../../lib/shop/compare-storage';
import {
  readCompareEntries,
  writeCompareEntries,
  getCompareProductIds,
  reconcileCompareEntriesWithProducts,
  groupCompareEntriesByResolvedCategory,
  resolveCompareCategoryId,
  COMPARE_UNCATEGORIZED_KEY,
  MAX_COMPARE_PER_CATEGORY,
} from '../../lib/shop/compare-storage';
import { CompareGroupTable, type CompareTableProduct } from './CompareGroupTable';
import {
  COMPARE_EMPTY_STATE_DESCRIPTION_CLASS,
  COMPARE_EMPTY_STATE_HEADLINE_STACK_CLASS,
  COMPARE_EMPTY_STATE_IMAGE_DISPLAY_CLASS,
  COMPARE_EMPTY_STATE_IMAGE_INTRINSIC_HEIGHT_PX,
  COMPARE_EMPTY_STATE_IMAGE_INTRINSIC_WIDTH_PX,
  COMPARE_EMPTY_STATE_IMAGE_SIZES_ATTR,
  COMPARE_EMPTY_STATE_IMAGE_SRC,
  COMPARE_EMPTY_STATE_TEXT_BLOCK_CLASS,
  COMPARE_EMPTY_STATE_TITLE_CLASS,
  COMPARE_EMPTY_STATE_WRAPPER_CLASS,
} from './compare-layout.constants';

interface Product extends CompareTableProduct {
  primaryCategoryId?: string | null;
  categories?: Array<{ id: string; slug: string; title: string }>;
}

function resolveCategorySectionTitle(
  categoryId: string,
  sample: Product | undefined,
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

/**
 * Compare page: one table per category; up to four products per category block.
 */
export default function ComparePage() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [compareEntries, setCompareEntries] = useState(() =>
    typeof window === 'undefined' ? [] : readCompareEntries(),
  );
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState(getStoredCurrency());
  const addToCartInFlightRef = useRef<Set<string>>(new Set());
  const isLocalUpdateRef = useRef(false);

  const fetchCompareProducts = useCallback(async (entriesSnapshot: CompareEntry[]) => {
    const idsToLoad = getCompareProductIds(entriesSnapshot);
    if (idsToLoad.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const languagePreference = getStoredLanguage();
      const response = await apiClient.get<{
        data: Product[];
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
        .filter((p): p is Product => Boolean(p));
      setProducts(ordered);
    } catch (error) {
      console.error('[Compare] Error fetching compare products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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
      void fetchCompareProducts(updated);
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
      void fetchCompareProducts(current);
    };

    window.addEventListener('currency-updated', handleCurrencyUpdate);
    window.addEventListener('language-updated', handleLanguageUpdate);
    return () => {
      window.removeEventListener('currency-updated', handleCurrencyUpdate);
      window.removeEventListener('language-updated', handleLanguageUpdate);
    };
  }, [fetchCompareProducts]);

  const handleRemove = (e: MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();

    isLocalUpdateRef.current = true;

    const updatedEntries = readCompareEntries().filter((entry) => entry.productId !== productId);
    writeCompareEntries(updatedEntries);
    setCompareEntries(updatedEntries);
    setProducts((prev) => prev.filter((p) => p.id !== productId));

    window.dispatchEvent(new Event('compare-updated'));
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="py-6 text-center">
          <div className="animate-pulse space-y-4">
            <div className="mx-auto h-6 w-1/4 rounded bg-gray-200"></div>
            <div className="mt-4 h-48 rounded-lg bg-gray-200"></div>
          </div>
        </div>
      </div>
    );
  }

  const productById = new Map(products.map((p) => [p.id, p]));
  const groupedEntries = groupCompareEntriesByResolvedCategory(compareEntries, productById);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('common.compare.title')}</h1>
        {products.length > 0 && (
          <p className="text-sm text-gray-600">{t('common.compare.perCategoryHint')}</p>
        )}
      </div>

      {products.length > 0 ? (
        <div>
          {groupedEntries.map((group, index) => {
            const rowProducts = group
              .map((e) => productById.get(e.productId))
              .filter((p): p is Product => Boolean(p));
            if (rowProducts.length === 0) return null;
            const categoryId = resolveCompareCategoryId(rowProducts[0]);
            const heading = resolveCategorySectionTitle(categoryId, rowProducts[0], t);
            const sectionDomId = `compare-group-${categoryId}-${index}`;
            const n = rowProducts.length;
            const summaryLine = `${n} / ${MAX_COMPARE_PER_CATEGORY} ${
              n === 1 ? t('common.compare.product') : t('common.compare.products')
            }`;
            return (
              <CompareGroupTable
                key={sectionDomId}
                sectionDomId={sectionDomId}
                categoryHeading={heading}
                compareSummaryLine={summaryLine}
                products={rowProducts}
                currency={currency}
                t={t}
                addToCartInFlightRef={addToCartInFlightRef}
                onRemove={handleRemove}
              />
            );
          })}
        </div>
      ) : (
        <div className={COMPARE_EMPTY_STATE_WRAPPER_CLASS}>
          <Image
            src={COMPARE_EMPTY_STATE_IMAGE_SRC}
            alt={t('common.compare.empty')}
            width={COMPARE_EMPTY_STATE_IMAGE_INTRINSIC_WIDTH_PX}
            height={COMPARE_EMPTY_STATE_IMAGE_INTRINSIC_HEIGHT_PX}
            sizes={COMPARE_EMPTY_STATE_IMAGE_SIZES_ATTR}
            className={COMPARE_EMPTY_STATE_IMAGE_DISPLAY_CLASS}
            unoptimized
          />
          <div className={COMPARE_EMPTY_STATE_TEXT_BLOCK_CLASS}>
            <div className={COMPARE_EMPTY_STATE_HEADLINE_STACK_CLASS}>
              <h2 className={COMPARE_EMPTY_STATE_TITLE_CLASS}>{t('common.compare.empty')}</h2>
              <p className={COMPARE_EMPTY_STATE_DESCRIPTION_CLASS}>{t('common.compare.emptyDescription')}</p>
            </div>
            <Link href="/products" className="w-full">
              <Button
                variant="primary"
                size="lg"
                className="h-14 w-full !rounded-full !bg-admin-500 px-2.5 text-sm font-semibold leading-normal !text-white hover:!bg-admin-500 active:!bg-admin-500 focus:!ring-admin-500 focus:!ring-offset-2"
              >
                {t('common.compare.browseProducts')}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
