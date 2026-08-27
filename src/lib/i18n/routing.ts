import { LANGUAGE_COOKIE_NAME, type LanguageCode } from '@/lib/language';

/** Locales that appear as the first URL segment on the storefront. */
export const APP_LOCALES = ['hy', 'en', 'ru'] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_APP_LOCALE: AppLocale = 'hy';

const APP_LOCALE_SET = new Set<string>(APP_LOCALES);

const LOCALE_EXEMPT_PREFIXES = [
  '/api',
  '/_next',
  '/supersudo',
  '/admin',
  '/__admin_path_disabled',
] as const;

export const STOREFRONT_OG_LOCALE: Record<AppLocale, string> = {
  hy: 'hy_AM',
  en: 'en_US',
  ru: 'ru_RU',
};

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return Boolean(value && APP_LOCALE_SET.has(value));
}

export function asLanguageCode(locale: AppLocale): LanguageCode {
  return locale;
}

function splitPathname(pathname: string): { pathname: string; search: string; hash: string } {
  const hashIndex = pathname.indexOf('#');
  const hash = hashIndex >= 0 ? pathname.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? pathname.slice(0, hashIndex) : pathname;
  const searchIndex = withoutHash.indexOf('?');
  const search = searchIndex >= 0 ? withoutHash.slice(searchIndex) : '';
  const pathOnly = searchIndex >= 0 ? withoutHash.slice(0, searchIndex) : withoutHash;
  return { pathname: pathOnly || '/', search, hash };
}

function firstPathSegment(pathname: string): string | null {
  const trimmed = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  if (!trimmed) {
    return null;
  }
  const slash = trimmed.indexOf('/');
  return slash === -1 ? trimmed : trimmed.slice(0, slash);
}

export function isLocaleExemptPath(pathname: string): boolean {
  if (pathname === '/favicon.ico' || pathname === '/robots.txt' || pathname === '/sitemap.xml') {
    return true;
  }
  return LOCALE_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function parseLocaleFromPathname(pathname: string): AppLocale | null {
  const { pathname: pathOnly } = splitPathname(pathname);
  const segment = firstPathSegment(pathOnly);
  return isAppLocale(segment) ? segment : null;
}

export function stripLocalePrefix(pathname: string): string {
  const { pathname: pathOnly, search, hash } = splitPathname(pathname);
  const locale = parseLocaleFromPathname(pathOnly);
  if (!locale) {
    return `${pathOnly}${search}${hash}`;
  }
  const rest = pathOnly.slice(locale.length + 1);
  const normalized = rest.length > 0 ? rest : '/';
  return `${normalized}${search}${hash}`;
}

export function addLocalePrefix(pathname: string, locale: AppLocale): string {
  const { pathname: pathOnly, search, hash } = splitPathname(pathname);
  if (!pathOnly.startsWith('/') || pathOnly.startsWith('//')) {
    return pathname;
  }
  if (isLocaleExemptPath(pathOnly) || parseLocaleFromPathname(pathOnly)) {
    return `${pathOnly}${search}${hash}`;
  }
  if (pathOnly === '/') {
    return `/${locale}${search}${hash}`;
  }
  return `/${locale}${pathOnly}${search}${hash}`;
}

export function localizeHref(href: string, locale: AppLocale): string {
  if (!href.startsWith('/') || href.startsWith('//')) {
    return href;
  }
  return addLocalePrefix(href, locale);
}

export function resolveStorefrontHomeHref(currentPathname: string): string {
  const locale = parseLocaleFromPathname(currentPathname) ?? DEFAULT_APP_LOCALE;
  return addLocalePrefix('/', locale);
}

function normalizeQuery(search: string): string {
  const trimmed = search.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.startsWith('?') ? trimmed : `?${trimmed}`;
}

function normalizeHash(hash: string): string {
  const trimmed = hash.trim();
  if (!trimmed || trimmed === '#') {
    return '';
  }
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

/**
 * Same storefront page in another locale. Preserves query string and hash.
 * Pathname may include query/hash; explicit `search`/`hash` win when provided.
 */
export function buildLocaleSwitchHref(
  currentPathname: string,
  search: string,
  nextLocale: AppLocale,
  hash = '',
): string {
  const stripped = stripLocalePrefix(currentPathname);
  const parts = splitPathname(stripped);
  const query = normalizeQuery(search) || parts.search;
  const hashPart = normalizeHash(hash) || parts.hash;
  return `${addLocalePrefix(parts.pathname, nextLocale)}${query}${hashPart}`;
}

export function listAlternateAppLocales(currentLocale: AppLocale): AppLocale[] {
  return APP_LOCALES.filter((locale) => locale !== currentLocale);
}

export function readLocaleFromCookieValue(raw: string | undefined | null): AppLocale | null {
  if (!raw) {
    return null;
  }
  try {
    const decoded = decodeURIComponent(raw);
    return isAppLocale(decoded) ? decoded : null;
  } catch {
    return isAppLocale(raw) ? raw : null;
  }
}

export { LANGUAGE_COOKIE_NAME };
