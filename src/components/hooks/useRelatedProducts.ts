'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api-client';
import { getStoredLanguage, type LanguageCode } from '../../lib/language';

interface RelatedProduct {
  id: string;
  slug: string;
  title: string;
  price: number;
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
  categorySlug?: string;
  currentProductId: string;
  language: LanguageCode;
}

/**
 * Hook for fetching related products
 */
export function useRelatedProducts({ categorySlug, currentProductId, language }: UseRelatedProductsProps) {
  const [products, setProducts] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      try {
        setLoading(true);
        
        // Build params - if no categorySlug, fetch all products
        const params: Record<string, string> = {
          limit: '30', // Fetch more to ensure we have 10 after filtering
          lang: language,
        };
        
        if (categorySlug) {
          params.category = categorySlug;
          console.log('[RelatedProducts] Fetching related products for category:', categorySlug);
        } else {
          console.log('[RelatedProducts] No categorySlug, fetching all products');
        }
        
        const response = await apiClient.get<{
          data: RelatedProduct[];
          meta: {
            total: number;
          };
        }>('/api/v1/products', {
          params,
        });

        console.log('[RelatedProducts] Received products:', response.data.length);
        // Filter out current product and take exactly 10
        const filtered = response.data.filter(p => p.id !== currentProductId);
        console.log('[RelatedProducts] After filtering current product:', filtered.length);
        const finalProducts = filtered.slice(0, 10);
        console.log('[RelatedProducts] Final products to display:', finalProducts.length);
        setProducts(finalProducts);
      } catch (error) {
        console.error('[RelatedProducts] Error fetching related products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedProducts();
  }, [categorySlug, currentProductId, language]);

  return { products, loading };
}




