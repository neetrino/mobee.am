import { stripLocalePrefix } from '@/lib/i18n/routing';

/** Canonical profile path — keep in sync with `src/app/[locale]/profile/page.tsx` route. */
export const PROFILE_ROUTE_PATH = '/profile' as const;

/**
 * True when the pathname is the customer profile area (mobile shell hides top Header here).
 */
export function isProfileRoutePath(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }
  const normalized = stripLocalePrefix(pathname);
  if (normalized === PROFILE_ROUTE_PATH) {
    return true;
  }
  return normalized.startsWith(`${PROFILE_ROUTE_PATH}/`);
}
