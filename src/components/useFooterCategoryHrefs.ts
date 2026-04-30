'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../lib/api-client';
import { getStoredLanguage } from '../lib/language';
import {
  ACCESSORIES_SLUG_PARTS,
  COMPUTERS_SLUG_PARTS,
  findCategoryBySlugParts,
  PHONES_SLUG_PARTS,
  TABLETS_SLUG_PARTS,
  WATCHES_SLUG_PARTS,
  type CategoryTreeNode,
} from '../lib/category-nav';

type Category = CategoryTreeNode;

interface CategoriesResponse {
  data: Category[];
}

function hrefFor(category: CategoryTreeNode | null): string {
  if (!category) return '/products';
  return `/products?category=${encodeURIComponent(category.slug)}`;
}

export function useFooterCategoryHrefs() {
  const [categories, setCategories] = useState<Category[]>([]);

  const loadCategories = useCallback(async () => {
    try {
      const lang = getStoredLanguage();
      const response = await apiClient.get<CategoriesResponse>('/api/v1/categories/tree', {
        params: { lang },
      });
      setCategories(response.data || []);
    } catch {
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const onLang = () => void loadCategories();
    window.addEventListener('language-updated', onLang);
    return () => window.removeEventListener('language-updated', onLang);
  }, [loadCategories]);

  return useMemo(
    () => ({
      phones: hrefFor(findCategoryBySlugParts(categories, PHONES_SLUG_PARTS)),
      computers: hrefFor(findCategoryBySlugParts(categories, COMPUTERS_SLUG_PARTS)),
      tablets: hrefFor(findCategoryBySlugParts(categories, TABLETS_SLUG_PARTS)),
      watches: hrefFor(findCategoryBySlugParts(categories, WATCHES_SLUG_PARTS)),
      accessories: hrefFor(findCategoryBySlugParts(categories, ACCESSORIES_SLUG_PARTS)),
    }),
    [categories],
  );
}
