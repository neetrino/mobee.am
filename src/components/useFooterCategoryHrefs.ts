'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

function isCategoriesResponse(value: unknown): value is CategoriesResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const data = (value as { data?: unknown }).data;
  return Array.isArray(data);
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
      const response = await fetch(`/api/v1/categories/tree?lang=${encodeURIComponent(lang)}`, {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        setCategories([]);
        return;
      }

      const rawData: unknown = await response.json();
      if (!isCategoriesResponse(rawData)) {
        setCategories([]);
        return;
      }

      setCategories(rawData.data);
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
