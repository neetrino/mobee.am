'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api-client';
import type { LanguageCode } from '../../lib/language';

interface RelatedProduct {
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

interface UseRelatedProductsProps {
  currentProductSlug: string;
  language: LanguageCode;
}

/**
 * Hook for fetching related products
 */
export function useRelatedProducts({ currentProductSlug, language }: UseRelatedProductsProps) {
  const [products, setProducts] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      try {
        setLoading(true);
        
        const params: Record<string, string> = {
          limit: '10',
          lang: language,
        };

        const response = await apiClient.get<{
          data: RelatedProduct[];
        }>(`/api/v1/products/${encodeURIComponent(currentProductSlug)}/related`, {
          params,
        });

        setProducts(response.data.slice(0, 10));
      } catch (error) {
        console.error('[RelatedProducts] Error fetching related products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedProducts();
  }, [currentProductSlug, language]);

  return { products, loading };
}




