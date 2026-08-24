import { extractMediaUrl } from "../utils/extractMediaUrl";
import { processImageUrl, smartSplitUrls } from "../utils/image-utils";

type MediaHolder = { media?: unknown };
type VariantWithImage = { imageUrl?: string | null; media?: unknown };

function resolveVariantPrimaryImageUrl(variant: VariantWithImage): string | null {
  const rawVariant = variant?.imageUrl?.trim();
  if (rawVariant) {
    const firstVariantUrl = smartSplitUrls(rawVariant)[0];
    if (firstVariantUrl) {
      const processed = processImageUrl(firstVariantUrl);
      if (processed) {
        return processed;
      }
    }
  }

  return extractMediaUrl(variant?.media);
}

/**
 * Cart line image priority:
 * 1. selected variant primary imageUrl (first comma-separated URL)
 * 2. selected variant first media entry
 * 3. product gallery media
 */
export function resolveCartLineProductImageUrl(
  product: MediaHolder,
  variant: VariantWithImage,
): string | null {
  const fromVariant = resolveVariantPrimaryImageUrl(variant);
  if (fromVariant) {
    return fromVariant;
  }

  return extractMediaUrl(product.media);
}
