import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {
  buildAlternateLocaleHrefs,
  prefetchAlternateLocaleRoutes,
  prefetchLocaleSwitchRoute,
} from './prefetch-alternate-locales';
import { clearStorefrontPrefetchDedupForTests } from '@/lib/navigation/storefront-prefetch';

function createRouter(): AppRouterInstance & { prefetch: ReturnType<typeof vi.fn> } {
  const prefetch = vi.fn();
  return { prefetch } as unknown as AppRouterInstance & { prefetch: ReturnType<typeof vi.fn> };
}

function setNavigatorConnection(connection?: { saveData?: boolean; effectiveType?: string }): void {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { connection },
  });
}

describe('prefetch alternate locale routes', () => {
  afterEach(() => {
    clearStorefrontPrefetchDedupForTests();
    Reflect.deleteProperty(globalThis, 'navigator');
  });

  it('builds hrefs for the other locales and keeps the query string', () => {
    expect(
      buildAlternateLocaleHrefs({
        pathname: '/hy/shop',
        search: 'page=2&category=phones',
      }),
    ).toEqual(['/en/shop?page=2&category=phones', '/ru/shop?page=2&category=phones']);
  });

  it('does not include the current locale', () => {
    const hrefs = buildAlternateLocaleHrefs({
      pathname: '/ru/products/iphone',
      search: '',
      currentLocale: 'ru',
    });
    expect(hrefs).toEqual(['/hy/products/iphone', '/en/products/iphone']);
    expect(hrefs.some((href) => href.startsWith('/ru/'))).toBe(false);
  });

  it('skips admin and API paths', () => {
    expect(buildAlternateLocaleHrefs({ pathname: '/supersudo/orders', search: '' })).toEqual([]);
    expect(buildAlternateLocaleHrefs({ pathname: '/api/v1/products', search: '' })).toEqual([]);
  });

  it('deduplicates repeated prefetch of the same href', () => {
    const router = createRouter();
    prefetchAlternateLocaleRoutes(router, '/hy/shop', 'page=2');
    prefetchAlternateLocaleRoutes(router, '/hy/shop', 'page=2');
    expect(router.prefetch).toHaveBeenCalledTimes(2);
    expect(router.prefetch).toHaveBeenCalledWith('/en/shop?page=2');
    expect(router.prefetch).toHaveBeenCalledWith('/ru/shop?page=2');
  });

  it('does not prefetch the current locale on interaction', () => {
    const router = createRouter();
    prefetchLocaleSwitchRoute(router, 'hy', '/hy/shop', '');
    expect(router.prefetch).not.toHaveBeenCalled();
  });

  it('blocks aggressive prefetch when saveData is enabled', () => {
    setNavigatorConnection({ saveData: true });
    const router = createRouter();
    prefetchAlternateLocaleRoutes(router, '/hy/shop', '');
    expect(router.prefetch).not.toHaveBeenCalled();
  });

  it('blocks aggressive prefetch on 2g', () => {
    setNavigatorConnection({ effectiveType: '2g' });
    const router = createRouter();
    prefetchAlternateLocaleRoutes(router, '/en/shop', '');
    expect(router.prefetch).not.toHaveBeenCalled();
  });
});
