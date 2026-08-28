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
  options?: VariantOption[];
}

/**
 * Extracts color from variant options
 */
export function extractColorFromOptions(variant: Variant): string {
  if (!variant.options || !Array.isArray(variant.options)) {
    return variant.color || '';
  }

  const colorOption = variant.options.find((opt) => {
    return opt.attributeKey === 'color' || opt.key === 'color' || opt.attribute === 'color';
  });
  if (colorOption?.value) {
    return colorOption.value;
  }

  const colorOptionByValue = variant.options.find((opt) => {
    if (!opt.attributeValue) return false;
    const attrValue = opt.attributeValue;
    return attrValue.attribute?.key === 'color' || attrValue.attributeKey === 'color';
  });
  if (colorOptionByValue?.attributeValue?.value) {
    return colorOptionByValue.attributeValue.value;
  }

  return variant.color || '';
}

/**
 * Extracts size from variant options
 */
export function extractSizeFromOptions(variant: Variant): string {
  if (!variant.options || !Array.isArray(variant.options)) {
    return variant.size || '';
  }

  const sizeOption = variant.options.find((opt) => {
    return opt.attributeKey === 'size' || opt.key === 'size' || opt.attribute === 'size';
  });
  if (sizeOption?.value) {
    return sizeOption.value;
  }

  const sizeOptionByValue = variant.options.find((opt) => {
    if (!opt.attributeValue) return false;
    const attrValue = opt.attributeValue;
    return attrValue.attribute?.key === 'size' || attrValue.attributeKey === 'size';
  });
  if (sizeOptionByValue?.attributeValue?.value) {
    return sizeOptionByValue.attributeValue.value;
  }

  return variant.size || '';
}

/**
 * Extracts color from relational options, then the formatted color field.
 * SKU is not a color source — that invented phantom swatches in admin.
 */
export function extractColor(variant: Variant): string {
  return extractColorFromOptions(variant);
}

/**
 * Extracts size from relational options, then the formatted size field.
 */
export function extractSize(variant: Variant): string {
  return extractSizeFromOptions(variant);
}

