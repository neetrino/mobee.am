'use client';

import { useEffect } from 'react';
import type { ProductFilters } from '@/lib/services/products-find-query/types';
import { productFiltersToApiParams } from '@/lib/shop/product-filters-to-api-params';

type ListMeta = {
  page: number;
  totalPages: number;
};

/**
 * Warms HTTP cache for the next catalog page (same filters, page+1) during idle time.
 */
export function usePrefetchNextProductListPage(
  filters: ProductFilters,
  meta: ListMeta | null | undefined,
): void {
  useEffect(() => {
    if (!meta || meta.totalPages < 1 || meta.page >= meta.totalPages) {
      return;
    }

    const nextFilters: ProductFilters = { ...filters, page: meta.page + 1 };
    const params = productFiltersToApiParams(nextFilters);
    const qs = new URLSearchParams(params).toString();
    const url = `/api/v1/products?${qs}`;

    const run = () => {
      void fetch(url, { method: 'GET', credentials: 'same-origin', cache: 'default' });
    };

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
  }, [filters, meta]);
}
