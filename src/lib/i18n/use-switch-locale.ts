'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { persistLanguagePreference } from '@/lib/language';
import { buildLocaleSwitchHref, type AppLocale } from '@/lib/i18n/routing';

/**
 * Navigate to the same storefront page in another locale and remember the choice.
 */
export function useSwitchStorefrontLocale(): (nextLocale: AppLocale) => void {
  const router = useRouter();

  return useCallback(
    (nextLocale: AppLocale) => {
      const pathname = window.location.pathname;
      const search = window.location.search.replace(/^\?/, '');
      persistLanguagePreference(nextLocale);
      router.push(buildLocaleSwitchHref(pathname, search, nextLocale));
    },
    [router],
  );
}
