/**
 * Login URL with post-auth redirect (see `src/app/login/page.tsx` `redirect` search param).
 */
export function getLoginUrlWithRedirect(returnPath: string): string {
  const safePath =
    returnPath.length > 0 && returnPath.startsWith('/') ? returnPath : '/';
  return `/login?redirect=${encodeURIComponent(safePath)}`;
}
