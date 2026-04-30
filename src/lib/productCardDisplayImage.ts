const FALLBACK_PRODUCT_CARD_DISPLAY_SRC = "/images/product-card-display.png";

const fromEnv = process.env.NEXT_PUBLIC_PRODUCT_CARD_DISPLAY_IMAGE_URL;

/**
 * Static art on product cards (grid, list, related carousel).
 * After one-time upload to R2, set `NEXT_PUBLIC_PRODUCT_CARD_DISPLAY_IMAGE_URL` to the public URL.
 */
export const PRODUCT_CARD_DISPLAY_IMAGE_SRC =
  typeof fromEnv === "string" && fromEnv.trim().length > 0
    ? fromEnv.trim()
    : FALLBACK_PRODUCT_CARD_DISPLAY_SRC;

/**
 * Prefer the product's stored image URL (e.g. R2 public URL); otherwise card display / local fallback.
 */
export function resolveProductCardImageSrc(
  productImage: string | null | undefined,
): string {
  const trimmed =
    typeof productImage === "string" ? productImage.trim() : "";
  return trimmed.length > 0 ? trimmed : PRODUCT_CARD_DISPLAY_IMAGE_SRC;
}
