import type { Product, ProductMedia, ProductVariant } from '../types';
import { processImageUrl } from '../../../../lib/utils/image-utils';

function extractMediaUrl(item: ProductMedia | string): string | null {
  if (typeof item === 'string') return item || null;
  return item?.url || null;
}

/**
 * Returns the active gallery for the selected variant.
 * Falls back to product.media when variant has no dedicated media.
 */
export function getVariantMedia(
  product: Product | null,
  selectedVariant: ProductVariant | null | undefined,
): string[] {
  if (!product) return [];

  const variantMedia = (selectedVariant?.media ?? [])
    .map(extractMediaUrl)
    .filter((url): url is string => Boolean(url));

  if (variantMedia.length > 0) {
    const mainUrl = selectedVariant?.imageUrl
      ? processImageUrl(selectedVariant.imageUrl)
      : null;
    if (mainUrl && variantMedia[0] !== mainUrl) {
      const withoutMain = variantMedia.filter((url) => url !== mainUrl);
      return [mainUrl, ...withoutMain];
    }
    return variantMedia;
  }

  if (selectedVariant?.imageUrl) {
    const processed = processImageUrl(selectedVariant.imageUrl);
    if (processed) return [processed];
  }

  const productMedia = (product.media ?? [])
    .map(extractMediaUrl)
    .filter((url): url is string => Boolean(url));

  return productMedia;
}

export function getVariantMainImageIndex(
  selectedVariant: ProductVariant | null | undefined,
  images: string[],
): number {
  if (!selectedVariant?.imageUrl || images.length === 0) {
    return 0;
  }

  const mainUrl = processImageUrl(selectedVariant.imageUrl);
  if (!mainUrl) return 0;

  const index = images.findIndex((img) => img === mainUrl);
  return index >= 0 ? index : 0;
}
