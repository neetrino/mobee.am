import { extractMediaUrl } from "../utils/extractMediaUrl";
import { processImageUrl, smartSplitUrls } from "../utils/image-utils";

type MediaHolder = { media?: unknown };
type VariantWithImage = { imageUrl?: string | null };

/**
 * Cart line image: prefer product gallery media, then first URL from the variant's imageUrl
 * (comma-separated in DB). Matches storefront behavior when main media is empty.
 */
export function resolveCartLineProductImageUrl(
  product: MediaHolder,
  variant: VariantWithImage,
): string | null {
  const fromMedia = extractMediaUrl(product.media);
  const processedMedia = fromMedia ? processImageUrl(fromMedia) : null;
  if (processedMedia) {
    return processedMedia;
  }
  const rawVariant = variant?.imageUrl?.trim();
  if (!rawVariant) {
    return null;
  }
  const firstVariantUrl = smartSplitUrls(rawVariant)[0];
  return firstVariantUrl ? processImageUrl(firstVariantUrl) : null;
}
