'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api-client';
import type { Review } from '../utils';

/**
 * Hook for fetching and managing reviews
 */
export function useReviews(productId?: string, productSlug?: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReviews = async () => {
    try {
      // Use slug if available, otherwise fall back to productId
      const identifier = productSlug || productId;
      if (!identifier) {
        console.warn('⚠️ [PRODUCT REVIEWS] No product identifier provided');
        setReviews([]);
        setLoading(false);
        return;
      }

      console.log('📝 [PRODUCT REVIEWS] Loading reviews for product:', identifier);
      setLoading(true);
      const data = await apiClient.get<Review[]>(`/api/v1/products/${identifier}/reviews`);
      console.log('✅ [PRODUCT REVIEWS] Reviews loaded:', data?.length || 0);
      setReviews(data || []);
    } catch (error: unknown) {
      console.error('❌ [PRODUCT REVIEWS] Error loading reviews:', error);
      // If 404, product might not have reviews yet - that's okay
      const err = error as { status?: number };
      if (err.status !== 404) {
        console.error('Failed to load reviews:', error);
      }
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [productId, productSlug]);

  return {
    reviews,
    loading,
    setReviews,
    loadReviews,
  };
}




