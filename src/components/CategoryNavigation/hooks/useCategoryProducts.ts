'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api-client';
import { getStoredLanguage } from '../../../lib/language';
import type { Category } from '../utils';

interface Product {
  id: string;
  slug: string;
  title: string;
  image: string | null;
}

interface ProductsResponse {
  data: Product[];
  meta: {
    total: number;
  };
}

/**
 * Hook for fetching first product with image for each category
 */
export function useCategoryProducts(categories: Category[], t: (path: string) => string) {
  const [categoryProducts, setCategoryProducts] = useState<Record<string, Product | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (categories.length === 0) {
      setLoading(false);
      return;
    }

    const fetchCategoryProducts = async () => {
      try {
        setLoading(true);
        const language = getStoredLanguage();
        const products: Record<string, Product | null> = {};
        
        // Add "All" category
        const allCategoriesWithAll = [
          { id: 'all', slug: 'all', title: t('products.categoryNavigation.all'), fullPath: 'all', children: [] } as Category,
          ...categories
        ];

        // Fetch products for each category
        const categoryPromises = allCategoriesWithAll.map(async (category) => {
          try {
            const params: Record<string, string> = {
              limit: '5',
              lang: language,
            };
            if (category.slug !== 'all') {
              params.category = category.slug;
            }

            console.log(`🔍 [CategoryNavigation] Fetching products for category: "${category.title}" (slug: "${category.slug}")`, params);
            const productsResponse = await apiClient.get<ProductsResponse>('/api/v1/products', {
              params,
            });
            
            console.log(`📦 [CategoryNavigation] Response for "${category.title}":`, {
              total: productsResponse.meta?.total || 0,
              productsCount: productsResponse.data?.length || 0,
              firstProductId: productsResponse.data?.[0]?.id,
              firstProductImage: productsResponse.data?.[0]?.image,
            });
            
            // If category has 0 products, it might mean category was not found
            if (productsResponse.meta?.total === 0 && category.slug !== 'all') {
              console.warn(`⚠️ [CategoryNavigation] Category "${category.title}" (${category.slug}) has 0 products - category might not exist in database`);
            }
            
            // Get first product with image
            const productWithImage = productsResponse.data && productsResponse.data.length > 0
              ? (productsResponse.data.find(p => p.image) || productsResponse.data[0] || null)
              : null;
            products[category.slug] = productWithImage;
            
            console.log(`✅ [CategoryNavigation] Category "${category.title}" (${category.slug}): selected product: ${productWithImage?.id} (image: ${productWithImage?.image ? 'yes' : 'no'})`);
          } catch (err) {
            console.error(`❌ [CategoryNavigation] Error fetching product for category ${category.slug}:`, err);
            products[category.slug] = null;
          }
        });

        await Promise.all(categoryPromises);
        setCategoryProducts(products);
        
        // Log final state to verify each category has unique product
        console.log('✅ [CategoryNavigation] All categories processed');
        console.log('📊 [CategoryNavigation] Final category products mapping:', 
          Object.entries(products).map(([slug, product]) => ({
            slug,
            productId: product?.id || 'null',
            productImage: product?.image || 'null',
          }))
        );
        
        // Check for duplicate products
        const productIds = Object.values(products).map(p => p?.id).filter(Boolean);
        const uniqueProductIds = new Set(productIds);
        if (productIds.length !== uniqueProductIds.size) {
          console.warn('⚠️ [CategoryNavigation] WARNING: Some categories have the same product!', {
            totalProducts: productIds.length,
            uniqueProducts: uniqueProductIds.size,
            duplicates: productIds.filter((id, index) => productIds.indexOf(id) !== index)
          });
        }
      } catch (err) {
        console.error('Error fetching category products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryProducts();
  }, [categories, t]);

  return { categoryProducts, loading };
}




