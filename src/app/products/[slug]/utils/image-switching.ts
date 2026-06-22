import type { Product, ProductVariant } from '../types';
import { getVariantMainImageIndex } from './variant-media';

/**
 * Switch gallery to the selected variant's main image index.
 * Gallery URLs themselves come from getVariantMedia / useProductImages.
 */
export function switchToVariantImage(
  variant: ProductVariant | null,
  _product: Product | null,
  images: string[],
  setCurrentImageIndex: (index: number) => void,
): void {
  if (!variant || images.length === 0) {
    setCurrentImageIndex(0);
    return;
  }

  setCurrentImageIndex(getVariantMainImageIndex(variant, images));
}

/**
 * Handle color selection — gallery refresh is driven by useProductImages.
 */
export function handleColorSelect(
  color: string,
  _product: Product | null,
  _images: string[],
  selectedColor: string | null,
  setSelectedColor: (color: string | null) => void,
  _setCurrentImageIndex: (index: number) => void,
): void {
  if (!color) return;
  const normalizedColor = color.toLowerCase().trim();
  if (selectedColor === normalizedColor) {
    setSelectedColor(null);
  } else {
    setSelectedColor(normalizedColor);
  }
}
