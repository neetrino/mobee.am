/**
 * Resolves a product listing/detail image URL.
 * Returns null when the product has no image — callers should show
 * {@link ProductImagePlaceholder} instead of a fake phone photo.
 */
export function resolveProductCardImageSrc(
  productImage: string | null | undefined,
): string | null {
  if (typeof productImage === "string" && productImage.trim().length > 0) {
    return productImage.trim();
  }
  return null;
}

/**
 * @deprecated Kept for rare fly-animation / decorative callers that still need a string.
 * Prefer {@link resolveProductCardImageSrc} + placeholder UI when the product has no image.
 */
export const PRODUCT_CARD_DISPLAY_IMAGE_SRC: string | null = null;
