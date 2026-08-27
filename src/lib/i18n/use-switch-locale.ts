'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { persistLanguagePreference } from '@/lib/language';
import { prefetchLocaleSwitchRoute } from '@/lib/i18n/prefetch-alternate-locales';
import {
  isLocaleSwitchNoop,
  shouldCorrectStaleLocaleNavigation,
} from '@/lib/i18n/locale-switch-race';
import {
  buildLocaleSwitchHref,
  DEFAULT_APP_LOCALE,
  parseLocaleFromPathname,
  type AppLocale,
} from '@/lib/i18n/routing';

export type StorefrontLocaleSwitchApi = {
  switchLocale: (nextLocale: AppLocale) => void;
  prefetchLocale: (nextLocale: AppLocale) => void;
  displayLocale: AppLocale;
  isPending: boolean;
};

function readLocationParts(): { pathname: string; search: string; hash: string } {
  return {
    pathname: window.location.pathname,
    search: window.location.search.replace(/^\?/, ''),
    hash: window.location.hash,
  };
}

function pushLocaleRoute(router: ReturnType<typeof useRouter>, nextLocale: AppLocale): void {
  const { pathname, search, hash } = readLocationParts();
  router.push(buildLocaleSwitchHref(pathname, search, nextLocale, hash));
}

function clearLocaleSwitchRequest(
  requestedRef: { current: AppLocale | null },
  inflightRef: { current: AppLocale | null },
  setPendingLocale: (value: AppLocale | null) => void,
): void {
  requestedRef.current = null;
  inflightRef.current = null;
  setPendingLocale(null);
}

function useLocaleSwitchRequestSync(
  urlLocale: AppLocale,
  router: ReturnType<typeof useRouter>,
  requestedRef: { current: AppLocale | null },
  inflightRef: { current: AppLocale | null },
  setPendingLocale: (value: AppLocale | null) => void,
  startTransition: (callback: () => void) => void,
): void {
  useEffect(() => {
    const onPopState = (): void => {
      clearLocaleSwitchRequest(requestedRef, inflightRef, setPendingLocale);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [inflightRef, requestedRef, setPendingLocale]);

  useEffect(() => {
    const requested = requestedRef.current;
    if (!requested) {
      return;
    }
    if (urlLocale === requested) {
      clearLocaleSwitchRequest(requestedRef, inflightRef, setPendingLocale);
      return;
    }
    if (!shouldCorrectStaleLocaleNavigation(urlLocale, requested, inflightRef.current)) {
      return;
    }
    inflightRef.current = requested;
    startTransition(() => {
      pushLocaleRoute(router, requested);
    });
  }, [inflightRef, requestedRef, router, setPendingLocale, startTransition, urlLocale]);
}

/**
 * Navigate to the same storefront page in another locale and remember the choice.
 * Uses `router.push` so Back restores the previous language URL.
 */
export function useSwitchStorefrontLocale(): StorefrontLocaleSwitchApi {
  const router = useRouter();
  const pathname = usePathname();
  const urlLocale = parseLocaleFromPathname(pathname ?? '') ?? DEFAULT_APP_LOCALE;
  const [isPending, startTransition] = useTransition();
  const [pendingLocale, setPendingLocale] = useState<AppLocale | null>(null);
  const requestedRef = useRef<AppLocale | null>(null);
  const inflightRef = useRef<AppLocale | null>(null);

  useLocaleSwitchRequestSync(
    urlLocale,
    router,
    requestedRef,
    inflightRef,
    setPendingLocale,
    startTransition,
  );

  const switchLocale = useCallback(
    (nextLocale: AppLocale) => {
      if (isLocaleSwitchNoop(urlLocale, nextLocale, requestedRef.current)) {
        return;
      }
      persistLanguagePreference(nextLocale);
      requestedRef.current = nextLocale;
      inflightRef.current = nextLocale;
      setPendingLocale(nextLocale);
      startTransition(() => {
        pushLocaleRoute(router, nextLocale);
      });
    },
    [router, startTransition, urlLocale],
  );

  const prefetchLocale = useCallback(
    (nextLocale: AppLocale) => {
      const { pathname: path, search } = readLocationParts();
      prefetchLocaleSwitchRoute(router, nextLocale, path, search);
    },
    [router],
  );

  return {
    switchLocale,
    prefetchLocale,
    displayLocale: pendingLocale ?? urlLocale,
    isPending: isPending || pendingLocale !== null,
  };
}
