export const PRODUCT_PAGE_COLOR_QUERY_PARAM = 'color';

export interface ProductPageHrefOptions {
  color?: string | null;
}

/**
 * Builds a storefront PDP href with optional pre-selected color query param.
 */
export function buildProductPageHref(
  slug: string,
  options: ProductPageHrefOptions = {},
): string {
  const trimmedSlug = slug.trim();
  if (!trimmedSlug) {
    return '/products';
  }

  const color = options.color?.trim();
  if (!color) {
    return `/products/${trimmedSlug}`;
  }

  const params = new URLSearchParams();
  params.set(PRODUCT_PAGE_COLOR_QUERY_PARAM, color);
  return `/products/${trimmedSlug}?${params.toString()}`;
}

export function parseProductPageColorParam(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) {
    return null;
  }

  return value.trim().toLowerCase();
}

/**
 * Builds the storefront PDP pathname, optionally with a variant id suffix.
 */
export function buildProductPagePathname(
  slug: string,
  variantIdFromUrl: string | null = null,
): string {
  const trimmedSlug = slug.trim();
  if (!trimmedSlug) {
    return '/products';
  }

  const variantId = variantIdFromUrl?.trim();
  if (variantId) {
    return `/products/${trimmedSlug}:${variantId}`;
  }

  return `/products/${trimmedSlug}`;
}

/**
 * Updates the browser URL to reflect the current color selection without navigation.
 */
export function syncProductPageColorInUrl(
  slug: string,
  variantIdFromUrl: string | null,
  color: string | null,
): void {
  if (typeof window === 'undefined') {
    return;
  }

  const pathname = buildProductPagePathname(slug, variantIdFromUrl);
  const normalizedColor = color?.trim();
  const nextUrl = normalizedColor
    ? `${pathname}?${PRODUCT_PAGE_COLOR_QUERY_PARAM}=${encodeURIComponent(normalizedColor)}`
    : pathname;

  const currentUrl = `${window.location.pathname}${window.location.search}`;
  if (currentUrl !== nextUrl) {
    window.history.replaceState(window.history.state, '', nextUrl);
  }
}
