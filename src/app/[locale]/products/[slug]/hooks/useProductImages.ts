import { useMemo } from "react";
import type { Product, ProductVariant } from "../types";
import { getVariantMedia } from "../utils/variant-media";

/**
 * Returns gallery URLs for the selected variant (or default/fallback product media).
 */
export function useProductImages(
  product: Product | null,
  selectedVariant: ProductVariant | null | undefined,
): string[] {
  return useMemo(
    () => getVariantMedia(product, selectedVariant),
    [product, selectedVariant],
  );
}
