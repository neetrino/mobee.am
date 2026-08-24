import {
  getProductColorHex,
  isKnownProductColor,
  normalizeColorKey,
  PRODUCT_COLOR_HEX,
} from './product-color-hex.constants';

/** @deprecated Prefer getProductColorHex from product-color-hex.constants */
export function getColorHex(colorName: string): string {
  return getProductColorHex(colorName);
}

export { getProductColorHex, isKnownProductColor, normalizeColorKey, PRODUCT_COLOR_HEX };
