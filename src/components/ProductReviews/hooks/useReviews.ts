'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../lib/api-client';
import type { Review } from '../utils';

/**
 * Hook for fetching and managing reviews
 */
export function useReviews(productId?: string, productSlug?: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReviews = useCallback(async () => {
    try {
      const identifier = productSlug || productId;
      if (!identifier) {
        setReviews([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const params: Record<string, string> = {};
      if (productId) {
        params.productId = productId;
      }

      const data = await apiClient.get<Review[]>(`/api/v1/products/${identifier}/reviews`, {
        params: Object.keys(params).length > 0 ? params : undefined,
      });
      setReviews(data || []);
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err.status !== 404) {
        console.error('Failed to load reviews:', error);
      }
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [productId, productSlug]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  return {
    reviews,
    loading,
    setReviews,
    loadReviews,
  };
}
