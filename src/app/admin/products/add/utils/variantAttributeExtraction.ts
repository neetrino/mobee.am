/**
 * Utilities for extracting color and size attributes from variants
 */

interface VariantOption {
  attributeKey?: string;
  key?: string;
  attribute?: string;
  value?: string;
  attributeValue?: {
    attribute?: {
      key?: string;
    };
    attributeKey?: string;
    value?: string;
  };
}

interface Variant {
  color?: string;
  size?: string;
  sku?: string;
  options?: VariantOption[];
}

/**
 * Extracts color from variant options
 */
export function extractColorFromOptions(variant: Variant): string {
  if (variant.color) {
    return variant.color;
  }

  if (!variant.options || !Array.isArray(variant.options)) {
    return '';
  }

  // Search for color in options
  const colorOption = variant.options.find((opt) => {
    return opt.attributeKey === 'color' || opt.key === 'color' || opt.attribute === 'color';
  });

  if (colorOption?.value) {
    return colorOption.value;
  }

  // Search in attributeValue
  const colorOptionByValue = variant.options.find((opt) => {
    if (opt.attributeValue) {
      const attrValue = opt.attributeValue;
      return attrValue.attribute?.key === 'color' || attrValue.attributeKey === 'color';
    }
    return false;
  });

  if (colorOptionByValue?.attributeValue?.value) {
    return colorOptionByValue.attributeValue.value;
  }

  return '';
}

/**
 * Extracts size from variant options
 */
export function extractSizeFromOptions(variant: Variant): string {
  if (variant.size) {
    return variant.size;
  }

  if (!variant.options || !Array.isArray(variant.options)) {
    return '';
  }

  // Search for size in options
  const sizeOption = variant.options.find((opt) => {
    return opt.attributeKey === 'size' || opt.key === 'size' || opt.attribute === 'size';
  });

  if (sizeOption?.value) {
    return sizeOption.value;
  }

  // Search in attributeValue
  const sizeOptionByValue = variant.options.find((opt) => {
    if (opt.attributeValue) {
      const attrValue = opt.attributeValue;
      return attrValue.attribute?.key === 'size' || attrValue.attributeKey === 'size';
    }
    return false;
  });

  if (sizeOptionByValue?.attributeValue?.value) {
    return sizeOptionByValue.attributeValue.value;
  }

  return '';
}

/**
 * Extracts color from SKU (format: prefix-color-size)
 */
export function extractColorFromSku(variant: Variant): string {
  if (!variant.sku) {
    return '';
  }

  const skuParts = variant.sku.split('-');
  if (skuParts.length >= 2) {
    const possibleColor = skuParts[1];
    if (possibleColor && possibleColor.length > 0 && !/^\d+$/.test(possibleColor)) {
      return possibleColor;
    }
  }

  return '';
}

/**
 * Extracts size from SKU (format: prefix-color-size)
 */
export function extractSizeFromSku(variant: Variant): string {
  if (!variant.sku) {
    return '';
  }

  const skuParts = variant.sku.split('-');
  if (skuParts.length >= 3) {
    const possibleSize = skuParts[2];
    if (possibleSize) {
      return possibleSize;
    }
  }

  return '';
}

/**
 * Extracts color from variant (tries options first, then SKU)
 */
export function extractColor(variant: Variant): string {
  const colorFromOptions = extractColorFromOptions(variant);
  if (colorFromOptions) {
    return colorFromOptions;
  }

  return extractColorFromSku(variant);
}

/**
 * Extracts size from variant (tries options first, then SKU)
 */
export function extractSize(variant: Variant): string {
  const sizeFromOptions = extractSizeFromOptions(variant);
  if (sizeFromOptions) {
    return sizeFromOptions;
  }

  return extractSizeFromSku(variant);
}

