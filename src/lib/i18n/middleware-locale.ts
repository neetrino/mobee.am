import { NextRequest, NextResponse } from 'next/server';
import {
  DEFAULT_APP_LOCALE,
  LANGUAGE_COOKIE_NAME,
  isLocaleExemptPath,
  parseLocaleFromPathname,
  readLocaleFromCookieValue,
  type AppLocale,
} from '@/lib/i18n/routing';
import { LANGUAGE_COOKIE_MAX_AGE_SEC } from '@/lib/language';

const LOCALE_COOKIE_OPTIONS = {
  path: '/',
  maxAge: LANGUAGE_COOKIE_MAX_AGE_SEC,
  sameSite: 'lax' as const,
};

function resolvePreferredLocale(request: NextRequest): AppLocale {
  return (
    readLocaleFromCookieValue(request.cookies.get(LANGUAGE_COOKIE_NAME)?.value) ?? DEFAULT_APP_LOCALE
  );
}

function applyLocaleCookie(response: NextResponse, locale: AppLocale): NextResponse {
  response.cookies.set(LANGUAGE_COOKIE_NAME, locale, LOCALE_COOKIE_OPTIONS);
  return response;
}

/**
 * Prefix storefront URLs with `/hy|/en|/ru`. Skips API, admin, and static assets.
 * Returns null when this request is not a storefront page.
 */
export function handleStorefrontLocale(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  if (isLocaleExemptPath(pathname)) {
    return null;
  }

  const urlLocale = parseLocaleFromPathname(pathname);
  if (urlLocale) {
    return applyLocaleCookie(NextResponse.next(), urlLocale);
  }

  const locale = resolvePreferredLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = pathname === '/' ? `/${locale}` : `/${locale}${pathname}`;
  return applyLocaleCookie(NextResponse.redirect(url, 307), locale);
}
