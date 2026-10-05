import { useState, useEffect, useCallback } from 'react';
import { fetchAdminReference } from '@/lib/admin/admin-reference-api';
import {
  DEFAULT_ADMIN_CONTENT_LOCALE,
  type AdminContentLocale,
} from '@/lib/admin/admin-content-locale';
import { logger } from '../../../../lib/utils/logger';
import type { Category } from '../types';

interface FetchCategoriesOptions {
  silent?: boolean;
}

interface UseCategoriesReturn {
  categories: Category[];
  loading: boolean;
  error: string | null;
  fetchCategories: (options?: FetchCategoriesOptions) => Promise<void>;
}

/**
 * Hook for fetching and managing categories
 */
export function useCategories(locale: AdminContentLocale = DEFAULT_ADMIN_CONTENT_LOCALE): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async (options?: FetchCategoriesOptions) => {
    const silent = options?.silent === true;

    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      logger.debug('Fetching categories');
      const response = await fetchAdminReference<{ data: Category[] }>('categories', { locale });
      setCategories(response.data || []);
      logger.info('Categories loaded', { count: response.data?.length || 0 });
    } catch (err: unknown) {
      logger.error('Error fetching categories', { error: err });
      setCategories([]);
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [locale]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, loading, error, fetchCategories };
}




