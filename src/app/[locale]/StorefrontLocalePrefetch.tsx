'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { prefetchAlternateLocaleRoutes } from '@/lib/i18n/prefetch-alternate-locales';

/**
 * Warms Next.js RSC payloads for the same page in the other storefront locales.
 */
export function StorefrontLocalePrefetch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    prefetchAlternateLocaleRoutes(router, pathname ?? '/', search);
  }, [pathname, router, search]);

  return null;
}
