import { describe, expect, it, vi } from 'vitest';
import {
  buildProductPageHref,
  buildProductPagePathname,
  parseProductPageColorParam,
  PRODUCT_PAGE_COLOR_QUERY_PARAM,
  syncProductPageColorInUrl,
} from './product-page-href';

describe('buildProductPageHref', () => {
  it('builds slug-only href without color', () => {
    expect(buildProductPageHref('iphone-16-pro')).toBe('/products/iphone-16-pro');
  });

  it('appends color query param when provided', () => {
    expect(buildProductPageHref('iphone-16-pro', { color: 'black' })).toBe(
      `/products/iphone-16-pro?${PRODUCT_PAGE_COLOR_QUERY_PARAM}=black`,
    );
  });

  it('encodes special characters in color values', () => {
    expect(buildProductPageHref('iphone-16-pro', { color: 'space black' })).toBe(
      `/products/iphone-16-pro?${PRODUCT_PAGE_COLOR_QUERY_PARAM}=space+black`,
    );
  });
});

describe('parseProductPageColorParam', () => {
  it('normalizes color to lowercase', () => {
    expect(parseProductPageColorParam('Black')).toBe('black');
  });

  it('returns null for empty values', () => {
    expect(parseProductPageColorParam('')).toBeNull();
    expect(parseProductPageColorParam(undefined)).toBeNull();
  });
});

describe('buildProductPagePathname', () => {
  it('builds slug-only pathname', () => {
    expect(buildProductPagePathname('iphone-16-pro')).toBe('/products/iphone-16-pro');
  });

  it('appends variant id suffix when provided', () => {
    expect(buildProductPagePathname('iphone-16-pro', 'variant-123')).toBe(
      '/products/iphone-16-pro:variant-123',
    );
  });
});

describe('syncProductPageColorInUrl', () => {
  it('updates the browser URL with the selected color', () => {
    const replaceState = vi.fn();
    vi.stubGlobal('window', {
      location: { pathname: '/products/iphone-16-pro', search: '?color=Black' },
      history: { state: {}, replaceState },
    });

    syncProductPageColorInUrl('iphone-16-pro', null, 'White');

    expect(replaceState).toHaveBeenCalledWith(
      {},
      '',
      `/products/iphone-16-pro?${PRODUCT_PAGE_COLOR_QUERY_PARAM}=White`,
    );
  });

  it('does not call replaceState when the URL is already correct', () => {
    const replaceState = vi.fn();
    vi.stubGlobal('window', {
      location: {
        pathname: '/products/iphone-16-pro',
        search: `?${PRODUCT_PAGE_COLOR_QUERY_PARAM}=White`,
      },
      history: { state: {}, replaceState },
    });

    syncProductPageColorInUrl('iphone-16-pro', null, 'White');

    expect(replaceState).not.toHaveBeenCalled();
  });
});
