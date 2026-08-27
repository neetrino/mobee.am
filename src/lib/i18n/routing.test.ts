import { describe, expect, it } from 'vitest';
import {
  addLocalePrefix,
  buildLocaleSwitchHref,
  isAppLocale,
  isLocaleExemptPath,
  localizeHref,
  parseLocaleFromPathname,
  stripLocalePrefix,
} from './routing';

describe('storefront locale routing', () => {
  it('accepts only hy/en/ru as URL locales', () => {
    expect(isAppLocale('hy')).toBe(true);
    expect(isAppLocale('en')).toBe(true);
    expect(isAppLocale('ka')).toBe(false);
    expect(isAppLocale('shop')).toBe(false);
  });

  it('parses locale from the first path segment', () => {
    expect(parseLocaleFromPathname('/en/shop')).toBe('en');
    expect(parseLocaleFromPathname('/hy')).toBe('hy');
    expect(parseLocaleFromPathname('/shop')).toBeNull();
    expect(parseLocaleFromPathname('/')).toBeNull();
  });

  it('strips and adds locale prefixes without touching query or hash', () => {
    expect(stripLocalePrefix('/ru/products/iphone?color=black')).toBe(
      '/products/iphone?color=black',
    );
    expect(addLocalePrefix('/shop?page=2', 'en')).toBe('/en/shop?page=2');
    expect(addLocalePrefix('/', 'hy')).toBe('/hy');
    expect(addLocalePrefix('/en/shop', 'ru')).toBe('/en/shop');
  });

  it('does not prefix API or admin paths', () => {
    expect(isLocaleExemptPath('/api/v1/products')).toBe(true);
    expect(isLocaleExemptPath('/supersudo/orders')).toBe(true);
    expect(localizeHref('/api/v1/products', 'en')).toBe('/api/v1/products');
    expect(localizeHref('/supersudo', 'en')).toBe('/supersudo');
  });

  it('builds a same-page locale switch href', () => {
    expect(buildLocaleSwitchHref('/en/shop', 'page=2', 'ru')).toBe('/ru/shop?page=2');
    expect(buildLocaleSwitchHref('/hy', '', 'en')).toBe('/en');
  });

  it('replaces only the locale prefix and preserves query plus hash', () => {
    expect(buildLocaleSwitchHref('/hy/products/iphone', 'foo=bar', 'ru', '#reviews')).toBe(
      '/ru/products/iphone?foo=bar#reviews',
    );
    expect(buildLocaleSwitchHref('/en/shop?page=2', '', 'hy')).toBe('/hy/shop?page=2');
    expect(buildLocaleSwitchHref('/ru/shop', '', 'ru')).toBe('/ru/shop');
  });
});
