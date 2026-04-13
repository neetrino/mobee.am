import { findOrCreateAttributeValue } from "../../../utils/variant-generator";
import type { Prisma } from "@prisma/client";

/**
 * Variant option for processing
 */
export interface VariantOptionInput {
  attributeKey: string;
  value: string;
  valueId?: string;
}

/**
 * Processed variant option
 */
export interface ProcessedVariantOption {
  valueId?: string;
  attributeKey?: string;
  value?: string;
}

/**
 * Process variant options and build attributes map
 */
export async function processVariantOptions(
  variant: {
    options?: VariantOptionInput[];
    color?: string;
    size?: string;
  },
  locale: string,
  tx: Prisma.TransactionClient
): Promise<{
  options: ProcessedVariantOption[];
  attributesMap: Record<string, Array<{ valueId: string; value: string; attributeKey: string }>>;
}> {
  const options: ProcessedVariantOption[] = [];
  const attributesMap: Record<string, Array<{ valueId: string; value: string; attributeKey: string }>> = {};
  
  // Support both old format (color/size) and new format (options array)
  if (variant.options && Array.isArray(variant.options) && variant.options.length > 0) {
    // New format: use options array
    for (const opt of variant.options) {
      let valueId: string | null = null;
      let attributeKey: string | null = null;
      let value: string | null = null;

      if (opt.valueId) {
        valueId = opt.valueId;
        const attrValue = await tx.attributeValue.findUnique({
          where: { id: opt.valueId },
          include: { attribute: true },
        });
        if (attrValue) {
          attributeKey = attrValue.attribute.key;
          value = attrValue.value;
        }
        options.push({ valueId: opt.valueId });
      } else if (opt.attributeKey && opt.value) {
        const foundValueId = await findOrCreateAttributeValue(opt.attributeKey, opt.value, locale);
        if (foundValueId) {
          valueId = foundValueId;
          attributeKey = opt.attributeKey;
          value = opt.value;
          options.push({ valueId: foundValueId });
        } else {
          attributeKey = opt.attributeKey;
          value = opt.value;
          options.push({ attributeKey: opt.attributeKey, value: opt.value });
        }
      }

      // Build attributes JSONB structure
      if (attributeKey && valueId && value) {
        if (!attributesMap[attributeKey]) {
          attributesMap[attributeKey] = [];
        }
        if (!attributesMap[attributeKey].some(item => item.valueId === valueId)) {
          attributesMap[attributeKey].push({
            valueId,
            value,
            attributeKey,
          });
        }
      }
    }
  } else {
    // Old format: Try to find or create AttributeValues for color and size
    if (variant.color) {
      const colorValueId = await findOrCreateAttributeValue("color", variant.color, locale);
      if (colorValueId) {
        options.push({ valueId: colorValueId });
        if (!attributesMap["color"]) {
          attributesMap["color"] = [];
        }
        attributesMap["color"].push({
          valueId: colorValueId,
          value: variant.color,
          attributeKey: "color",
        });
      } else {
        // Fallback to old format if AttributeValue not found
        options.push({ attributeKey: "color", value: variant.color });
      }
    }
    
    if (variant.size) {
      const sizeValueId = await findOrCreateAttributeValue("size", variant.size, locale);
      if (sizeValueId) {
        options.push({ valueId: sizeValueId });
        if (!attributesMap["size"]) {
          attributesMap["size"] = [];
        }
        attributesMap["size"].push({
          valueId: sizeValueId,
          value: variant.size,
          attributeKey: "size",
        });
      } else {
        // Fallback to old format if AttributeValue not found
        options.push({ attributeKey: "size", value: variant.size });
      }
    }
  }

  return { options, attributesMap };
}

/**
 * Parse variant price, stock, and compareAtPrice
 */
export function parseVariantPrices(variant: {
  price: string | number;
  compareAtPrice?: string | number;
  stock: string | number;
}): {
  price: number;
  stock: number;
  compareAtPrice?: number;
} {
  const price = typeof variant.price === 'number' ? variant.price : parseFloat(String(variant.price));
  const stock = typeof variant.stock === 'number' ? variant.stock : parseInt(String(variant.stock), 10);
  const compareAtPrice = variant.compareAtPrice !== undefined && variant.compareAtPrice !== null && variant.compareAtPrice !== ''
    ? (typeof variant.compareAtPrice === 'number' ? variant.compareAtPrice : parseFloat(String(variant.compareAtPrice)))
    : undefined;

  if (isNaN(price) || price < 0) {
    throw new Error(`Invalid price value: ${variant.price}`);
  }

  return { price, stock, compareAtPrice };
}




