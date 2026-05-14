import { useMemo } from "react";
import { PRODUCT_CARD_DISPLAY_IMAGE_SRC } from "../../../../lib/productCardDisplayImage";
import type { Product } from "../types";

/** Same storefront hero image repeated so the PDP gallery shows three slides. */
const PDP_GALLERY_SLIDE_COUNT = 3;

/**
 * Product detail gallery — storefront display image repeated for multi-image UI until product media drives the gallery.
 */
export function useProductImages(_product: Product | null): string[] {
  return useMemo(
    () =>
      Array.from({ length: PDP_GALLERY_SLIDE_COUNT }, () => PRODUCT_CARD_DISPLAY_IMAGE_SRC),
    [],
  );
}
