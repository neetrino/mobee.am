/**
 * Re-export all utility functions from their respective modules
 * This file maintains backward compatibility while organizing code into smaller modules
 */

export { getColorValue } from './utils/color-helpers';
export { getOptionValue, variantHasColor } from './utils/variant-helpers';
export {
  findVariantByColorAndSize,
  findVariantByAllAttributes,
} from './utils/variant-finders';
export {
  switchToVariantImage,
  handleColorSelect,
} from './utils/image-switching';
