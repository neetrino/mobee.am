import { useMemo } from "react";
import type { Product, ProductVariant } from "../types";
import { getVariantGallery, type VariantGallery } from "../utils/variant-media";

/**
 * Returns gallery URLs for the selected variant (or default/fallback product media).
 */
export function useProductImages(
  product: Product | null,
  selectedVariant: ProductVariant | null | undefined,
): VariantGallery {
  return useMemo(
    () => getVariantGallery(product, selectedVariant),
    [product, selectedVariant],
  );
}
