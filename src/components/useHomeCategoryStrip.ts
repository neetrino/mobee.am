'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../lib/api-client';
import type { HomeStripCategoryItem } from '../lib/services/categories-home-strip-cached';
import { getStoredLanguage, type LanguageCode } from '../lib/language';

interface HomeCategoryStripResponse {
  data: HomeStripCategoryItem[];
}

export type UseHomeCategoryStripOptions = {
  initialItems?: HomeStripCategoryItem[];
  initialLocale?: LanguageCode;
};

export function useHomeCategoryStrip(options: UseHomeCategoryStripOptions = {}) {
  const { initialItems, initialLocale } = options;
  const hasInitial = Boolean(initialItems && initialItems.length > 0);

  const [items, setItems] = useState<HomeStripCategoryItem[]>(initialItems ?? []);
  const [loading, setLoading] = useState(!hasInitial);

  const fetchHomeStrip = useCallback(async () => {
    try {
      setLoading(true);
      const lang = getStoredLanguage();
      const response = await apiClient.get<HomeCategoryStripResponse>(
        '/api/v1/categories/home-strip',
        { params: { lang } },
      );
      setItems(response.data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasInitial && initialLocale === getStoredLanguage()) {
      setLoading(false);
      return;
    }
    void fetchHomeStrip();
  }, [fetchHomeStrip, hasInitial, initialLocale]);

  useEffect(() => {
    const onLang = () => void fetchHomeStrip();
    window.addEventListener('language-updated', onLang);
    return () => window.removeEventListener('language-updated', onLang);
  }, [fetchHomeStrip]);

  return { items, loadingHomeStrip: loading, refetchHomeStrip: fetchHomeStrip };
}
