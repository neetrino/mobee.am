import { useMemo } from "react";
import type { Product, ProductMedia } from "../types";

function extractMediaUrl(item: ProductMedia | string): string | null {
  if (typeof item === "string") return item || null;
  return item?.url || null;
}

/**
 * Returns the gallery image URLs from product.media.
 * Falls back to the variant imageUrl if media is empty.
 */
export function useProductImages(product: Product | null): string[] {
  return useMemo(() => {
    if (!product) return [];

    const mediaUrls = (product.media ?? [])
      .map(extractMediaUrl)
      .filter((url): url is string => Boolean(url));

    if (mediaUrls.length > 0) return mediaUrls;

    const variantUrl = product.variants?.[0]?.imageUrl;
    if (variantUrl) return [variantUrl];

    return [];
  }, [product]);
}
