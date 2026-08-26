import type { Product, ProductMedia, ProductVariant } from '../types';
import { processImageUrl, smartSplitUrls } from '../../../../../lib/utils/image-utils';

function extractMediaUrl(item: ProductMedia | string): string | null {
  if (typeof item === 'string') return item || null;
  return item?.url || null;
}

function dedupeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const url of urls) {
    if (!url || seen.has(url)) {
      continue;
    }
    seen.add(url);
    result.push(url);
  }

  return result;
}

function collectProductMediaUrls(product: Product): string[] {
  return (product.media ?? [])
    .map(extractMediaUrl)
    .filter((url): url is string => Boolean(url));
}

function collectVariantImageUrls(selectedVariant: ProductVariant): string[] {
  const fromImageUrl = selectedVariant.imageUrl
    ? smartSplitUrls(selectedVariant.imageUrl)
        .map((url) => processImageUrl(url))
        .filter((url): url is string => Boolean(url))
    : [];

  const fromMedia = (selectedVariant.media ?? [])
    .map(extractMediaUrl)
    .filter((url): url is string => Boolean(url));

  return dedupeUrls([...fromImageUrl, ...fromMedia]);
}

function isMultiVariantProduct(product: Product): boolean {
  return (product.variants?.length ?? 0) > 1;
}

function mergeVariantAndProductGallery(
  variantUrls: string[],
  productUrls: string[],
  allowProductExtras: boolean,
): string[] {
  if (variantUrls.length === 0) {
    return dedupeUrls(productUrls);
  }

  if (!allowProductExtras) {
    return dedupeUrls(variantUrls);
  }

  const variantSet = new Set(variantUrls);
  const productExtras = productUrls.filter((url) => !variantSet.has(url));
  return dedupeUrls([...variantUrls, ...productExtras]);
}

/**
 * Returns the active gallery for the selected variant.
 * Multi-variant products use variant-only media so color switches do not show other colors.
 */
export function getVariantMedia(
  product: Product | null,
  selectedVariant: ProductVariant | null | undefined,
): string[] {
  if (!product) return [];

  const productUrls = collectProductMediaUrls(product);

  if (!selectedVariant) {
    return dedupeUrls(productUrls);
  }

  const variantUrls = collectVariantImageUrls(selectedVariant);
  const allowProductExtras = !isMultiVariantProduct(product) || variantUrls.length === 0;
  return mergeVariantAndProductGallery(variantUrls, productUrls, allowProductExtras);
}

export function getVariantMainImageIndex(
  selectedVariant: ProductVariant | null | undefined,
  images: string[],
): number {
  if (!selectedVariant?.imageUrl || images.length === 0) {
    return 0;
  }

  const mainCandidates = smartSplitUrls(selectedVariant.imageUrl)
    .map((url) => processImageUrl(url))
    .filter((url): url is string => Boolean(url));

  for (const mainUrl of mainCandidates) {
    const index = images.findIndex((img) => img === mainUrl);
    if (index >= 0) {
      return index;
    }
  }

  return 0;
}
