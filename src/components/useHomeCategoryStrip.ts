'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../lib/api-client';
import { localizeCategoryTitle } from '../lib/category-title-i18n';
import type { HomeStripCategoryItem } from '../lib/services/categories-home-strip-cached';
import type { LanguageCode } from '../lib/language';
import { useUiLanguage } from './UiLanguageProvider';

interface HomeCategoryStripResponse {
  data: HomeStripCategoryItem[];
}

export type UseHomeCategoryStripOptions = {
  initialItems?: HomeStripCategoryItem[];
  initialLocale?: LanguageCode;
};

function localizeStripItems(
  items: HomeStripCategoryItem[],
  language: LanguageCode,
): HomeStripCategoryItem[] {
  return items.map((item) => {
    const localizedTitle = localizeCategoryTitle(item.title, language);
    return {
      ...item,
      title: localizedTitle || item.title,
    };
  });
}

export function useHomeCategoryStrip(options: UseHomeCategoryStripOptions = {}) {
  const { initialItems, initialLocale } = options;
  const language = useUiLanguage();
  const hasInitial = Boolean(initialItems && initialItems.length > 0);

  const [items, setItems] = useState<HomeStripCategoryItem[]>(() =>
    localizeStripItems(initialItems ?? [], language),
  );
  const [loading, setLoading] = useState(() => !(hasInitial && initialLocale === language));

  const fetchHomeStrip = useCallback(async (lang: LanguageCode) => {
    try {
      setLoading(true);
      const response = await apiClient.get<HomeCategoryStripResponse>(
        '/api/v1/categories/home-strip',
        { params: { lang } },
      );
      setItems(localizeStripItems(response.data || [], lang));
    } catch {
      setItems((current) => current);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasInitial && initialLocale === language && initialItems) {
      setItems(localizeStripItems(initialItems, language));
      setLoading(false);
      return;
    }
    void fetchHomeStrip(language);
  }, [fetchHomeStrip, hasInitial, initialItems, initialLocale, language]);

  const displayItems = useMemo(
    () => localizeStripItems(items, language),
    [items, language],
  );

  return {
    items: displayItems,
    loadingHomeStrip: loading,
    refetchHomeStrip: () => fetchHomeStrip(language),
  };
}
