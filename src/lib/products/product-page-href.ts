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
