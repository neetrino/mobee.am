'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../lib/api-client';
import type { HomeStripCategoryItem } from '../lib/services/categories-home-strip-cached';
import { getStoredLanguage } from '../lib/language';

interface HomeCategoryStripResponse {
  data: HomeStripCategoryItem[];
}

export function useHomeCategoryStrip() {
  const [items, setItems] = useState<HomeStripCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

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
    void fetchHomeStrip();
  }, [fetchHomeStrip]);

  useEffect(() => {
    const onLang = () => void fetchHomeStrip();
    window.addEventListener('language-updated', onLang);
    return () => window.removeEventListener('language-updated', onLang);
  }, [fetchHomeStrip]);

  return { items, loadingHomeStrip: loading, refetchHomeStrip: fetchHomeStrip };
}
