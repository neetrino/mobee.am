/** Primary header / mobile nav destinations — warmed on idle after first paint. */
export const HEADER_PREFETCH_ROUTES = [
  '/',
  '/shop',
  '/about',
  '/contact',
  '/cart',
  '/wishlist',
  '/compare',
  '/profile',
  '/login',
] as const;

/** Default shop list query — shared cache with RSC /shop and GET /api/v1/products. */
export function buildHeaderShopListWarmUrl(lang: string): string {
  const params = new URLSearchParams({
    page: '1',
    limit: '12',
    lang,
  });
  return `/api/v1/products?${params.toString()}`;
}
