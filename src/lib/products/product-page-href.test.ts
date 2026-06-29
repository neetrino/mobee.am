import { describe, expect, it } from 'vitest';
import {
  buildProductPageHref,
  parseProductPageColorParam,
  PRODUCT_PAGE_COLOR_QUERY_PARAM,
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
