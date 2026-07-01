import { processImageUrl } from '../utils/image-utils';
import {
  resolveListingColorLinkValue,
  resolveProductCardLinkColor,
  type ListingProductColor,
} from './listing-color-link';

export interface ProductCardDisplayColorSource {
  image: string | null;
  displayColor?: string | null;
  colors?: ListingProductColor[];
}

function normalizeImageForCompare(url: string | null | undefined): string | null {
  const processed = processImageUrl(url ?? null);
  if (!processed) return null;

  try {
    const parsed = new URL(processed, 'https://placeholder.local');
    return `${parsed.pathname}`.toLowerCase();
  } catch {
    return processed.toLowerCase();
  }
}

/**
 * Resolves the color token shown on a listing card from the displayed image.
 */
export function resolveDisplayColorFromListingImage(
  listingImage: string | null,
  colors: ListingProductColor[] | undefined,
  fallback: string | null,
): string | null {
  if (!listingImage?.trim() || !colors?.length) {
    return fallback;
  }

  const normalizedListing = normalizeImageForCompare(listingImage);
  if (!normalizedListing) {
    return fallback;
  }

  for (const color of colors) {
    const colorImage = normalizeImageForCompare(color.imageUrl);
    if (colorImage && colorImage === normalizedListing) {
      return resolveListingColorLinkValue(color);
    }
  }

  return fallback;
}

/**
 * Color token for PDP links from shop/home product cards.
 * Priority: active filter → API displayColor → image match.
 */
export function resolveProductCardNavigationColor(
  product: ProductCardDisplayColorSource,
  selectedFilterColors: string[],
): string | null {
  const filterColor = resolveProductCardLinkColor(product.colors, selectedFilterColors);
  if (filterColor) {
    return filterColor;
  }

  const displayColor = product.displayColor?.trim().toLowerCase();
  if (displayColor) {
    return displayColor;
  }

  return resolveDisplayColorFromListingImage(product.image, product.colors, null);
}
