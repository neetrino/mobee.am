'use client';

import { useEffect } from 'react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {
  buildHeaderShopListWarmUrl,
  HEADER_PREFETCH_ROUTES,
} from '@/lib/navigation/header-prefetch-routes';
import { getStoredLanguage } from '@/lib/language';

type UseHeaderRoutePrefetchOptions = {
  /** Re-run warm prefetch when this toggles (e.g. mobile drawer / categories menu). */
  boostKey?: boolean;
};

/**
 * Warms Next.js route bundles and the default shop product list API during idle time.
 */
export function useHeaderRoutePrefetch(
  router: AppRouterInstance,
  options: UseHeaderRoutePrefetchOptions = {},
): void {
  const { boostKey = false } = options;

  useEffect(() => {
    const warm = () => {
      for (const href of HEADER_PREFETCH_ROUTES) {
        try {
          router.prefetch(href);
        } catch {
          // ignore prefetch failures in dev / offline
        }
      }

      const lang = getStoredLanguage();
      void fetch(buildHeaderShopListWarmUrl(lang), {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'default',
      });
    };

    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (typeof requestIdleCallback !== 'undefined') {
      idleId = requestIdleCallback(warm, { timeout: boostKey ? 400 : 2500 });
    } else {
      timeoutId = setTimeout(warm, boostKey ? 0 : 400);
    }

    return () => {
      if (idleId !== undefined && typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [router, boostKey]);
}

/**
 * Prefetch a single href — use on category mega-menu hover.
 */
export function prefetchHeaderHref(router: AppRouterInstance, href: string): void {
  try {
    router.prefetch(href);
  } catch {
    // ignore
  }
}
