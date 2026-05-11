/** Canonical profile path — keep in sync with `src/app/profile/page.tsx` route. */
export const PROFILE_ROUTE_PATH = '/profile' as const;

/**
 * True when the pathname is the customer profile area (mobile shell hides top Header here).
 */
export function isProfileRoutePath(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }
  if (pathname === PROFILE_ROUTE_PATH) {
    return true;
  }
  return pathname.startsWith(`${PROFILE_ROUTE_PATH}/`);
}
