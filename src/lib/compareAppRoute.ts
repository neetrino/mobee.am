import { stripLocalePrefix } from '@/lib/i18n/routing';

const COMPARE_APP_PATH_PREFIX = '/compare';

/**
 * True when the pathname is the compare page (or a nested segment under it).
 */
export function isCompareAppRoute(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }
  const normalized = stripLocalePrefix(pathname);
  return (
    normalized === COMPARE_APP_PATH_PREFIX ||
    normalized.startsWith(`${COMPARE_APP_PATH_PREFIX}/`)
  );
}
