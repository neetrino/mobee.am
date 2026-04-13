import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../../lib/api-client';
import { logger } from '../../../../lib/utils/logger';
import type { Category } from '../types';

interface UseCategoriesReturn {
  categories: Category[];
  loading: boolean;
  error: string | null;
  fetchCategories: () => Promise<void>;
}

/**
 * Hook for fetching and managing categories
 */
export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      logger.debug('Fetching categories');
      const response = await apiClient.get<{ data: Category[] }>('/api/v1/admin/categories');
      setCategories(response.data || []);
      logger.info('Categories loaded', { count: response.data?.length || 0 });
    } catch (err: unknown) {
      logger.error('Error fetching categories', { error: err });
      setCategories([]);
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, loading, error, fetchCategories };
}




