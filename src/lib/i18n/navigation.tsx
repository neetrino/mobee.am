'use client';

import NextLink from 'next/link';
import {
  usePathname as useNextPathname,
  useRouter as useNextRouter,
} from 'next/navigation';
import { useMemo } from 'react';
import type { ComponentProps } from 'react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {
  DEFAULT_APP_LOCALE,
  localizeHref,
  parseLocaleFromPathname,
  stripLocalePrefix,
  type AppLocale,
} from '@/lib/i18n/routing';

type NextLinkProps = ComponentProps<typeof NextLink>;

function resolveLocale(pathname: string | null): AppLocale {
  return parseLocaleFromPathname(pathname ?? '') ?? DEFAULT_APP_LOCALE;
}

function localizeUnknownHref(href: NextLinkProps['href'], locale: AppLocale): NextLinkProps['href'] {
  if (typeof href === 'string') {
    return localizeHref(href, locale);
  }
  if (href && typeof href === 'object' && typeof href.pathname === 'string') {
    return { ...href, pathname: localizeHref(href.pathname, locale) };
  }
  return href;
}

/** Current storefront locale from the URL (`/en/...`). Admin falls back to default. */
export function useLocale(): AppLocale {
  const pathname = useNextPathname();
  return resolveLocale(pathname);
}

/** Pathname without the locale prefix (`/en/shop` → `/shop`). */
export function usePathname(): string {
  const pathname = useNextPathname();
  return stripLocalePrefix(pathname ?? '/');
}

export function useRouter(): AppRouterInstance {
  const router = useNextRouter();
  const locale = useLocale();

  return useMemo(() => {
    const push: AppRouterInstance['push'] = (href, options) =>
      router.push(localizeHref(href, locale), options);
    const replace: AppRouterInstance['replace'] = (href, options) =>
      router.replace(localizeHref(href, locale), options);
    const prefetch: AppRouterInstance['prefetch'] = (href, options) =>
      router.prefetch(localizeHref(href, locale), options);

    return {
      ...router,
      push,
      replace,
      prefetch,
    };
  }, [locale, router]);
}

/**
 * Storefront `Link` — prefixes hy/en/ru onto internal paths.
 * Leave admin/API hrefs unchanged.
 */
export function Link({ href, ...props }: NextLinkProps) {
  const locale = useLocale();
  return <NextLink href={localizeUnknownHref(href, locale)} {...props} />;
}
