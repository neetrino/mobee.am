import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { ProductFilters } from '@/lib/services/products-find-query/types';
import { buildShopProductFiltersFromSearchParams } from '@/lib/shop/build-shop-product-filters';
import { buildProductListCacheKey } from '@/lib/shop/product-list-cache-key';
import { productFiltersToApiParams } from '@/lib/shop/product-filters-to-api-params';
import {
  getProductListClientCache,
  setProductListClientCache,
} from '@/lib/shop/product-list-client-cache';
import type { ProductListPayload } from '@/lib/services/products-list-cached';
import type { LanguageCode } from '@/lib/language';

const warmedRoutes = new Set<string>();
const warmedApis = new Set<string>();

type NavigatorConnection = {
  saveData?: boolean;
  effectiveType?: string;
};

/** Skip aggressive prefetch on save-data / very slow connections. */
export function shouldAllowStorefrontPrefetch(): boolean {
  if (typeof navigator === 'undefined') {
    return true;
  }

  const connection = (navigator as Navigator & { connection?: NavigatorConnection }).connection;
  if (connection?.saveData) {
    return false;
  }

  const effectiveType = connection?.effectiveType;
  if (effectiveType === 'slow-2g' || effectiveType === '2g') {
    return false;
  }

  return true;
}

export function prefetchStorefrontRoute(router: AppRouterInstance, href: string): void {
  if (!shouldAllowStorefrontPrefetch()) {
    return;
  }

  const normalized = href.trim();
  if (!normalized || warmedRoutes.has(normalized)) {
    return;
  }

  warmedRoutes.add(normalized);
  try {
    router.prefetch(normalized);
  } catch {
    warmedRoutes.delete(normalized);
  }
}

function buildProductListApiUrl(filters: ProductFilters): string {
  const params = productFiltersToApiParams(filters);
  const qs = new URLSearchParams(params).toString();
  return `/api/v1/products?${qs}`;
}

function isProductListPayload(value: unknown): value is ProductListPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }
  return Array.isArray((value as ProductListPayload).data);
}

/** Warm GET /api/v1/products into the browser memory cache (and HTTP cache). */
export function warmShopProductListApi(filters: ProductFilters): void {
  if (!shouldAllowStorefrontPrefetch()) {
    return;
  }

  const cacheKey = buildProductListCacheKey(filters);
  if (getProductListClientCache(cacheKey)) {
    return;
  }

  const url = buildProductListApiUrl(filters);
  if (warmedApis.has(url)) {
    return;
  }

  warmedApis.add(url);
  void fetch(url, { method: 'GET', credentials: 'same-origin', cache: 'default' })
    .then(async (response) => {
      if (!response.ok) {
        warmedApis.delete(url);
        return;
      }
      const json: unknown = await response.json();
      if (isProductListPayload(json)) {
        setProductListClientCache(cacheKey, json);
      }
    })
    .catch(() => {
      warmedApis.delete(url);
    });
}

export function warmShopFromSearchParams(
  params: Record<string, string | undefined>,
  lang: LanguageCode,
): void {
  const filters = buildShopProductFiltersFromSearchParams(params, lang);
  warmShopProductListApi(filters);
}

export function buildShopHrefFromSearchParams(
  params: Record<string, string | undefined>,
): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value?.trim()) {
      qs.set(key, value.trim());
    }
  });
  const query = qs.toString();
  return query ? `/shop?${query}` : '/shop';
}

export function searchParamsToRecord(
  params: URLSearchParams,
): Record<string, string | undefined> {
  const record: Record<string, string | undefined> = {};
  params.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

/** Warm route + shop list API before filter/sort navigation (interaction-only). */
export function warmShopNavigationFromSearchParams(
  router: AppRouterInstance,
  params: URLSearchParams,
  lang: LanguageCode,
  pathname: string = '/shop',
): string {
  const record = searchParamsToRecord(params);
  const query = params.toString();
  const href = query ? `${pathname}?${query}` : pathname;
  prefetchStorefrontRoute(router, href);
  warmShopFromSearchParams(record, lang);
  return href;
}

export function warmShopCategoryNavigation(
  router: AppRouterInstance,
  categorySlug: string,
  lang: LanguageCode,
  extraParams: Record<string, string | undefined> = {},
): void {
  const params: Record<string, string | undefined> = {
    ...extraParams,
    category: categorySlug,
    page: '1',
  };

  const href = buildShopHrefFromSearchParams(params);
  prefetchStorefrontRoute(router, href);
  warmShopFromSearchParams(params, lang);
}

export function warmShopPaginationNavigation(
  router: AppRouterInstance,
  params: Record<string, string | undefined>,
  page: number,
  lang: LanguageCode,
): void {
  const nextParams = { ...params, page: String(page) };
  const href = buildShopHrefFromSearchParams(nextParams);
  prefetchStorefrontRoute(router, href);
  warmShopFromSearchParams(nextParams, lang);
}

export function clearStorefrontPrefetchDedupForTests(): void {
  warmedRoutes.clear();
  warmedApis.clear();
}
