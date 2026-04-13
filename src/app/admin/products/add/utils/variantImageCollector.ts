/**
 * Utilities for collecting variant images
 */

import type { ColorData } from '../types';

/**
 * Collects variant images from color data
 */
export function collectVariantImagesFromColors(colors: ColorData[]): Set<string> {
  const variantImages = new Set<string>();

  colors.forEach((c) => {
    c.images.forEach((img) => {
      if (img) {
        variantImages.add(img);
        const normalized = img.startsWith('/') ? img : `/${img}`;
        variantImages.add(normalized);
      }
    });
  });

  return variantImages;
}

/**
 * Collects variant images from product variants
 */
export function collectVariantImagesFromProductVariants(variants: unknown[]): Set<string> {
  const variantImages = new Set<string>();

  variants.forEach((variant: any) => {
    if (variant.imageUrl) {
      if (typeof variant.imageUrl === 'string' && variant.imageUrl.startsWith('data:')) {
        variantImages.add(variant.imageUrl);
      } else {
        const imageUrls =
          typeof variant.imageUrl === 'string'
            ? variant.imageUrl.split(',').map((url: string) => url.trim()).filter(Boolean)
            : [];
        imageUrls.forEach((url: string) => {
          if (url) {
            variantImages.add(url);
            const normalizedWithSlash = url.startsWith('/') ? url : `/${url}`;
            const normalizedWithoutSlash = url.startsWith('/') ? url.substring(1) : url;
            variantImages.add(normalizedWithSlash);
            variantImages.add(normalizedWithoutSlash);
            const urlWithoutQuery = url.split('?')[0];
            if (urlWithoutQuery !== url) {
              variantImages.add(urlWithoutQuery);
              const normalizedWithoutQuery = urlWithoutQuery.startsWith('/') ? urlWithoutQuery : `/${urlWithoutQuery}`;
              variantImages.add(normalizedWithoutQuery);
            }
          }
        });
      }
    }
  });

  return variantImages;
}

