const COMPARE_APP_PATH_PREFIX = '/compare';

/**
 * True when the pathname is the compare page (or a nested segment under it).
 */
export function isCompareAppRoute(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }
  return (
    pathname === COMPARE_APP_PATH_PREFIX ||
    pathname.startsWith(`${COMPARE_APP_PATH_PREFIX}/`)
  );
}
