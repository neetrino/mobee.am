'use client';

import { useEffect } from 'react';
import type { ProductFilters } from '@/lib/services/products-find-query/types';
import { warmShopProductListApi } from '@/lib/navigation/storefront-prefetch';

type ListMeta = {
  page: number;
  totalPages: number;
};

/**
 * Warms adjacent catalog pages (page±1) soon after the current list is ready.
 */
export function usePrefetchAdjacentProductListPages(
  filters: ProductFilters,
  meta: ListMeta | null | undefined,
): void {
  useEffect(() => {
    if (!meta || meta.totalPages < 1) {
      return;
    }

    const pagesToWarm = new Set<number>();
    if (meta.page < meta.totalPages) {
      pagesToWarm.add(meta.page + 1);
    }
    if (meta.page > 1) {
      pagesToWarm.add(meta.page - 1);
    }

    if (pagesToWarm.size === 0) {
      return;
    }

    const run = () => {
      for (const page of pagesToWarm) {
        warmShopProductListApi({ ...filters, page });
      }
    };

    // Prefer a short delay so first paint wins, then warm neighbors for instant pagination.
    const timeoutId = window.setTimeout(run, 100);
    return () => window.clearTimeout(timeoutId);
  }, [filters, meta]);
}

/** Warm a specific pagination target on hover/focus. */
export function warmShopProductListPage(filters: ProductFilters, page: number): void {
  warmShopProductListApi({ ...filters, page });
}
