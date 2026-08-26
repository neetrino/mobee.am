import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { LANGUAGE_COOKIE_NAME } from '@/lib/language';
import { handleStorefrontLocale } from './middleware-locale';

function pageRequest(path: string, cookie?: string): NextRequest {
  const headers = new Headers();
  if (cookie) {
    headers.set('cookie', `${LANGUAGE_COOKIE_NAME}=${cookie}`);
  }
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

describe('handleStorefrontLocale', () => {
  it('redirects unprefixed storefront paths to the default locale', () => {
    const response = handleStorefrontLocale(pageRequest('/shop'));
    expect(response?.status).toBe(307);
    expect(response?.headers.get('location')).toBe('http://localhost:3000/hy/shop');
  });

  it('uses the language cookie when prefixing a bare path', () => {
    const response = handleStorefrontLocale(pageRequest('/products/iphone', 'en'));
    expect(response?.headers.get('location')).toBe('http://localhost:3000/en/products/iphone');
  });

  it('leaves already-prefixed paths in place and mirrors the locale cookie', () => {
    const response = handleStorefrontLocale(pageRequest('/ru/shop?page=2'));
    expect(response?.status).toBe(200);
    expect(response?.headers.get('location')).toBeNull();
    const setCookie = response?.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain(`${LANGUAGE_COOKIE_NAME}=ru`);
  });

  it('does not rewrite API or admin routes', () => {
    expect(handleStorefrontLocale(pageRequest('/api/v1/products'))).toBeNull();
    expect(handleStorefrontLocale(pageRequest('/supersudo/orders'))).toBeNull();
  });
});
