import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { getStoredLanguage } from '@/lib/language';
import {
  touchProductCardCacheFromListing,
  type ProductCardCachePayload,
} from '@/lib/products/product-card-cache';
import {
  prefetchStorefrontRoute,
  shouldAllowStorefrontPrefetch,
} from '@/lib/navigation/storefront-prefetch';
import { buildProductPageHref } from '@/lib/products/product-page-href';

const warmedProductApis = new Set<string>();

function warmProductDetailApi(slug: string, lang: string): void {
  if (!shouldAllowStorefrontPrefetch()) {
    return;
  }

  const url = `/api/v1/products/${encodeURIComponent(slug)}?lang=${encodeURIComponent(lang)}`;
  if (warmedProductApis.has(url)) {
    return;
  }

  warmedProductApis.add(url);
  void fetch(url, { method: 'GET', credentials: 'same-origin', cache: 'default' }).catch(() => {
    warmedProductApis.delete(url);
  });
}

/** Write PLP cache + optional route/API warm before navigating to PDP. */
export function warmProductCardNavigation(
  payload: ProductCardCachePayload,
  router?: AppRouterInstance,
  linkColor?: string | null,
): void {
  touchProductCardCacheFromListing(payload);

  const slug = payload.slug?.trim();
  if (!slug) {
    return;
  }

  const href = buildProductPageHref(slug, { color: linkColor });
  if (router) {
    prefetchStorefrontRoute(router, href);
  }

  warmProductDetailApi(slug, getStoredLanguage());
}

export function buildProductCardNavHandlers(
  payload: ProductCardCachePayload,
  router?: AppRouterInstance,
  linkColor?: string | null,
): {
  onPointerDown: () => void;
  onMouseEnter: () => void;
  onFocus: () => void;
} {
  const warm = () => warmProductCardNavigation(payload, router, linkColor);
  return {
    onPointerDown: warm,
    onMouseEnter: warm,
    onFocus: warm,
  };
}
