'use client';

import { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../lib/api-client';
import { ApiError } from '../../lib/api-client/types';
import type { LanguageCode } from '../../lib/language';
import {
  buildRelatedProductsCacheKey,
  fetchRelatedProductsDeduped,
  readRelatedProductsCache,
  writeRelatedProductsCache,
} from '../../lib/products/related-products-cache';

export interface RelatedProduct {
  id: string;
  slug: string;
  title: string;
  price: number;
  /** From list API — avoids GET /products/:slug before POST /cart/items when logged in. */
  defaultVariantId?: string | null;
  originalPrice?: number | null;
  compareAtPrice: number | null;
  discountPercent?: number | null;
  image: string | null;
  inStock: boolean;
  brand?: {
    id: string;
    name: string;
  } | null;
  categories?: Array<{
    id: string;
    slug: string;
    title: string;
  }>;
  variants?: Array<{
    options?: Array<{
      key: string;
      value: string;
    }>;
  }>;
}

export type RelatedProductsContext = {
  productId: string;
  primaryCategoryId?: string | null;
  categoryIds?: string[];
};

interface UseRelatedProductsProps {
  currentProductSlug: string;
  language: LanguageCode;
  relatedContext?: RelatedProductsContext | null;
}

function buildRelatedQueryParams(
  language: LanguageCode,
  relatedContext?: RelatedProductsContext | null,
): Record<string, string> {
  const params: Record<string, string> = {
    limit: '10',
    lang: language,
  };

  if (relatedContext?.productId) {
    params.productId = relatedContext.productId;
    if (relatedContext.primaryCategoryId) {
      params.primaryCategoryId = relatedContext.primaryCategoryId;
    }
    const categoryIds = relatedContext.categoryIds?.filter(Boolean) ?? [];
    if (categoryIds.length > 0) {
      params.categoryIds = categoryIds.join(',');
    }
  }

  return params;
}

/**
 * Hook for fetching related products — cache-first, non-blocking, in-flight deduped.
 */
export function useRelatedProducts({
  currentProductSlug,
  language,
  relatedContext,
}: UseRelatedProductsProps) {
  // Keep SSR and the first client render identical — sessionStorage is read only in useEffect.
  const [products, setProducts] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const relatedContextRef = useRef(relatedContext);
  relatedContextRef.current = relatedContext;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const key = buildRelatedProductsCacheKey(
        currentProductSlug,
        language,
        relatedContextRef.current?.productId,
      );
      const cached = readRelatedProductsCache(key);
      if (cached) {
        setProducts(cached);
        setLoading(false);
        setFailed(false);
        return;
      }

      setLoading(true);
      setFailed(false);

      try {
        const fetched = await fetchRelatedProductsDeduped(key, async () => {
          const params = buildRelatedQueryParams(language, relatedContextRef.current);
          const response = await apiClient.get<{ data: RelatedProduct[] }>(
            `/api/v1/products/${encodeURIComponent(currentProductSlug)}/related`,
            { params },
          );
          return response.data.slice(0, 10);
        });

        if (cancelled) {
          return;
        }

        setProducts(fetched);
        writeRelatedProductsCache(key, fetched);
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (!(error instanceof ApiError && error.status === 404)) {
          console.error('[RelatedProducts] Error fetching related products:', error);
        }
        setProducts([]);
        setFailed(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [currentProductSlug, language, relatedContext?.productId, relatedContext?.categoryIds?.join(',')]);

  return { products, loading, failed };
}
