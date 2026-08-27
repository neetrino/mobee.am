import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { prefetchStorefrontRoute } from '@/lib/navigation/storefront-prefetch';
import {
  buildLocaleSwitchHref,
  isLocaleExemptPath,
  listAlternateAppLocales,
  parseLocaleFromPathname,
  type AppLocale,
} from '@/lib/i18n/routing';

export function buildAlternateLocaleHrefs(args: {
  pathname: string;
  search: string;
  currentLocale?: AppLocale | null;
}): string[] {
  const { pathname, search } = args;
  if (isLocaleExemptPath(pathname)) {
    return [];
  }

  const current = args.currentLocale ?? parseLocaleFromPathname(pathname);
  if (!current) {
    return [];
  }

  return listAlternateAppLocales(current).map((locale) =>
    buildLocaleSwitchHref(pathname, search, locale),
  );
}

export function prefetchAlternateLocaleRoutes(
  router: AppRouterInstance,
  pathname: string,
  search: string,
): void {
  for (const href of buildAlternateLocaleHrefs({ pathname, search })) {
    prefetchStorefrontRoute(router, href);
  }
}

export function prefetchLocaleSwitchRoute(
  router: AppRouterInstance,
  nextLocale: AppLocale,
  pathname: string,
  search: string,
): void {
  if (isLocaleExemptPath(pathname)) {
    return;
  }

  const current = parseLocaleFromPathname(pathname);
  if (!current || current === nextLocale) {
    return;
  }

  prefetchStorefrontRoute(router, buildLocaleSwitchHref(pathname, search, nextLocale));
}

export function localeSwitchIntentHandlers(
  prefetchLocale: (locale: AppLocale) => void,
  locale: AppLocale,
): {
  onPointerEnter: () => void;
  onFocus: () => void;
  onTouchStart: () => void;
} {
  const prefetch = (): void => {
    prefetchLocale(locale);
  };

  return {
    onPointerEnter: prefetch,
    onFocus: prefetch,
    onTouchStart: prefetch,
  };
}
