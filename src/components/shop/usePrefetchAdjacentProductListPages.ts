'use client';

import { useEffect } from 'react';
import type { ProductFilters } from '@/lib/services/products-find-query/types';
import { warmShopProductListApi } from '@/lib/navigation/storefront-prefetch';

type ListMeta = {
  page: number;
  totalPages: number;
};

function scheduleIdleWarm(run: () => void): () => void {
  let idleId: number | undefined;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  if (typeof requestIdleCallback !== 'undefined') {
    idleId = requestIdleCallback(run, { timeout: 2500 });
  } else {
    timeoutId = setTimeout(run, 600);
  }

  return () => {
    if (idleId !== undefined && typeof cancelIdleCallback !== 'undefined') {
      cancelIdleCallback(idleId);
    }
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  };
}

/**
 * Warms adjacent catalog pages (page±1) during idle time.
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

    return scheduleIdleWarm(run);
  }, [filters, meta]);
}

/** Warm a specific pagination target on hover/focus. */
export function warmShopProductListPage(filters: ProductFilters, page: number): void {
  warmShopProductListApi({ ...filters, page });
}
