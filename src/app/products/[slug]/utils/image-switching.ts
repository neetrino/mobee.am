import type { Product, ProductVariant, VariantOption } from '../types';
import {
  processImageUrl,
  smartSplitUrls,
} from '../../../../lib/utils/image-utils';
import { variantHasColor } from './variant-helpers';
import { getOptionValue } from './variant-helpers';

/**
 * Helper function to normalize URLs for comparison
 */
function normalizeUrl(url: string): string {
  let normalized = url.trim();
  if (normalized.startsWith('/')) normalized = normalized.substring(1);
  if (normalized.endsWith('/'))
    normalized = normalized.substring(0, normalized.length - 1);
  return normalized.toLowerCase();
}

/**
 * Check if variant image is an attribute value image (these are excluded from gallery)
 */
function isAttributeValueImage(url: string, product: Product): boolean {
  if (!product.productAttributes) return false;

  for (const productAttr of product.productAttributes) {
    if (productAttr.attribute?.values) {
      for (const val of productAttr.attribute.values) {
        if (val.imageUrl) {
          const attrProcessed = processImageUrl(val.imageUrl);
          if (attrProcessed) {
            const normalizedAttr = normalizeUrl(attrProcessed);
            const normalizedVariant = normalizeUrl(url);
            if (normalizedAttr === normalizedVariant) {
              return true;
            }
          }
        }
      }
    }
  }
  return false;
}

/**
 * Find image index in images array by matching URL
 */
function findImageIndex(
  targetUrl: string,
  images: string[],
  processedTargetUrl: string
): number {
  return images.findIndex((img) => {
    if (!img) return false;

    const processedImg = processImageUrl(img);
    if (!processedImg) return false;

    const normalizedImg = normalizeUrl(processedImg);
    const normalizedTarget = normalizeUrl(processedTargetUrl);

    // Exact match after normalization
    if (normalizedImg === normalizedTarget) {
      return true;
    }

    // Match with/without leading slash
    const imgWithSlash = processedImg.startsWith('/')
      ? processedImg
      : `/${processedImg}`;
    const imgWithoutSlash = processedImg.startsWith('/')
      ? processedImg.substring(1)
      : processedImg;
    const targetWithSlash = processedTargetUrl.startsWith('/')
      ? processedTargetUrl
      : `/${processedTargetUrl}`;
    const targetWithoutSlash = processedTargetUrl.startsWith('/')
      ? processedTargetUrl.substring(1)
      : processedTargetUrl;

    if (
      imgWithSlash === targetWithSlash ||
      imgWithoutSlash === targetWithoutSlash ||
      imgWithSlash === targetWithoutSlash ||
      imgWithoutSlash === targetWithSlash
    ) {
      return true;
    }

    // Match by filename (for cases where paths differ but filename is same)
    if (!processedImg.startsWith('data:') && !processedTargetUrl.startsWith('data:')) {
      const imgFilename = processedImg.split('/').pop()?.toLowerCase().split('?')[0];
      const targetFilename = processedTargetUrl.split('/').pop()?.toLowerCase().split('?')[0];
      if (imgFilename && targetFilename && imgFilename === targetFilename) {
        return true;
      }
    }

    // For base64 images, compare directly
    if (processedImg.startsWith('data:') && processedTargetUrl.startsWith('data:')) {
      if (processedImg === processedTargetUrl) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Switch to variant's image if it exists
 * This function finds the variant's image in the images array and switches to it
 * Note: If variant image matches an attribute value image, it won't be in the gallery,
 * so we won't switch to it (attribute value images are excluded from gallery)
 */
export function switchToVariantImage(
  variant: ProductVariant | null,
  product: Product | null,
  images: string[],
  setCurrentImageIndex: (index: number) => void
): void {
  if (!variant || !variant.imageUrl || !product) {
    return;
  }

  const splitUrls = smartSplitUrls(variant.imageUrl);
  if (splitUrls.length === 0) {
    return;
  }

  // Try to find the first variant image in the images array
  for (const url of splitUrls) {
    if (!url || url.trim() === '') continue;

    const processedUrl = processImageUrl(url);
    if (!processedUrl) {
      continue;
    }

    // If this variant image is an attribute value image, skip it
    if (isAttributeValueImage(processedUrl, product)) {
      continue;
    }

    const imageIndex = findImageIndex(url, images, processedUrl);

    if (imageIndex !== -1) {
      setCurrentImageIndex(imageIndex);
      return;
    }
  }

  // Fallback: If variant image not found, try to find any variant with the same color
  if (product?.variants) {
    const variantColor = getOptionValue(variant.options, 'color');
    if (variantColor) {
      const colorVariants = product.variants.filter((v) => {
        return variantHasColor(v, variantColor) && v.imageUrl;
      });

      // Try to find image from any variant with the same color
      for (const colorVariant of colorVariants) {
        if (!colorVariant.imageUrl) continue;

        const colorSplitUrls = smartSplitUrls(colorVariant.imageUrl);
        for (const colorUrl of colorSplitUrls) {
          if (!colorUrl || colorUrl.trim() === '') continue;

          const processedColorUrl = processImageUrl(colorUrl);
          if (!processedColorUrl) continue;

          // Skip attribute value images
          if (isAttributeValueImage(processedColorUrl, product)) continue;

          const colorImageIndex = findImageIndex(colorUrl, images, processedColorUrl);

          if (colorImageIndex !== -1) {
            setCurrentImageIndex(colorImageIndex);
            return;
          }
        }
      }
    }
  }
}

/**
 * Handle color selection and switch to variant image
 */
export function handleColorSelect(
  color: string,
  product: Product | null,
  images: string[],
  selectedColor: string | null,
  setSelectedColor: (color: string | null) => void,
  setCurrentImageIndex: (index: number) => void
): void {
  if (!color || !product) return;
  const normalizedColor = color.toLowerCase().trim();
  if (selectedColor === normalizedColor) {
    setSelectedColor(null);
  } else {
    setSelectedColor(normalizedColor);

    // Immediately try to find and switch to a variant image with this color
    const colorVariants =
      product.variants?.filter(
        (v) => variantHasColor(v, normalizedColor) && v.imageUrl
      ) || [];

    // Try to find image from variants with this color
    for (const variant of colorVariants) {
      if (!variant.imageUrl) continue;

      const splitUrls = smartSplitUrls(variant.imageUrl);
      for (const url of splitUrls) {
        if (!url || url.trim() === '') continue;

        const processedUrl = processImageUrl(url);
        if (!processedUrl) continue;

        const imageIndex = findImageIndex(url, images, processedUrl);

        if (imageIndex !== -1) {
          setCurrentImageIndex(imageIndex);
          return; // Found and switched, exit early
        }
      }
    }
  }
}




