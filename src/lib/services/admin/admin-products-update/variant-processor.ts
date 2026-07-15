import { findOrCreateAttributeValue } from "../../../utils/variant-generator";
import type { Prisma } from "@white-shop/db";

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
 * Process variant options with bulk AttributeValue lookup (no N+1 findUnique).
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
  attributesMap: Record<
    string,
    Array<{ valueId: string; value: string; attributeKey: string }>
  >;
}> {
  const options: ProcessedVariantOption[] = [];
  const attributesMap: Record<
    string,
    Array<{ valueId: string; value: string; attributeKey: string }>
  > = {};

  const pushAttribute = (
    attributeKey: string,
    valueId: string,
    value: string
  ) => {
    if (!attributesMap[attributeKey]) {
      attributesMap[attributeKey] = [];
    }
    if (!attributesMap[attributeKey].some((item) => item.valueId === valueId)) {
      attributesMap[attributeKey].push({ valueId, value, attributeKey });
    }
  };

  if (variant.options && Array.isArray(variant.options)) {
    if (variant.options.length === 0) {
      return { options, attributesMap };
    }

    const valueIds = variant.options
      .map((opt) => opt.valueId)
      .filter((id): id is string => Boolean(id));

    const attrValues =
      valueIds.length > 0
        ? await tx.attributeValue.findMany({
            where: { id: { in: valueIds } },
            include: { attribute: true },
          })
        : [];

    const byId = new Map(attrValues.map((attrValue) => [attrValue.id, attrValue]));

    for (const opt of variant.options) {
      if (opt.valueId) {
        const attrValue = byId.get(opt.valueId);
        if (attrValue) {
          pushAttribute(attrValue.attribute.key, opt.valueId, attrValue.value);
        }
        options.push({ valueId: opt.valueId });
        continue;
      }

      if (opt.attributeKey && opt.value) {
        const foundValueId = await findOrCreateAttributeValue(
          opt.attributeKey,
          opt.value,
          locale
        );
        if (foundValueId) {
          pushAttribute(opt.attributeKey, foundValueId, opt.value);
          options.push({ valueId: foundValueId });
        } else {
          options.push({ attributeKey: opt.attributeKey, value: opt.value });
        }
      }
    }

    return { options, attributesMap };
  }

  if (variant.color) {
    const colorValueId = await findOrCreateAttributeValue(
      "color",
      variant.color,
      locale
    );
    if (colorValueId) {
      options.push({ valueId: colorValueId });
      pushAttribute("color", colorValueId, variant.color);
    } else {
      options.push({ attributeKey: "color", value: variant.color });
    }
  }

  if (variant.size) {
    const sizeValueId = await findOrCreateAttributeValue(
      "size",
      variant.size,
      locale
    );
    if (sizeValueId) {
      options.push({ valueId: sizeValueId });
      pushAttribute("size", sizeValueId, variant.size);
    } else {
      options.push({ attributeKey: "size", value: variant.size });
    }
  }

  return { options, attributesMap };
}

/**
 * Parse required price/stock for create / legacy replace.
 */
export function parseVariantPrices(variant: {
  price: string | number;
  compareAtPrice?: string | number | null;
  stock: string | number;
}): {
  price: number;
  stock: number;
  compareAtPrice?: number;
} {
  const price =
    typeof variant.price === "number"
      ? variant.price
      : parseFloat(String(variant.price));
  const stock =
    typeof variant.stock === "number"
      ? variant.stock
      : parseInt(String(variant.stock), 10);
  const compareAtPrice =
    variant.compareAtPrice !== undefined &&
    variant.compareAtPrice !== null &&
    variant.compareAtPrice !== ""
      ? typeof variant.compareAtPrice === "number"
        ? variant.compareAtPrice
        : parseFloat(String(variant.compareAtPrice))
      : undefined;

  if (isNaN(price) || price < 0) {
    throw new Error(`Invalid price value: ${variant.price}`);
  }

  return { price, stock, compareAtPrice };
}

/**
 * Parse optional fields for partial variant update.
 */
export function parsePartialVariantFields(variant: {
  price?: string | number;
  compareAtPrice?: string | number | null;
  stock?: string | number;
}): {
  price?: number;
  stock?: number;
  compareAtPrice?: number | null;
  hasCompareAtPrice: boolean;
} {
  const result: {
    price?: number;
    stock?: number;
    compareAtPrice?: number | null;
    hasCompareAtPrice: boolean;
  } = { hasCompareAtPrice: false };

  if (variant.price !== undefined) {
    const price =
      typeof variant.price === "number"
        ? variant.price
        : parseFloat(String(variant.price));
    if (isNaN(price) || price < 0) {
      throw new Error(`Invalid price value: ${variant.price}`);
    }
    result.price = price;
  }

  if (variant.stock !== undefined) {
    const stock =
      typeof variant.stock === "number"
        ? variant.stock
        : parseInt(String(variant.stock), 10);
    result.stock = isNaN(stock) ? 0 : stock;
  }

  if (variant.compareAtPrice !== undefined) {
    result.hasCompareAtPrice = true;
    if (variant.compareAtPrice === null || variant.compareAtPrice === "") {
      result.compareAtPrice = null;
    } else {
      result.compareAtPrice =
        typeof variant.compareAtPrice === "number"
          ? variant.compareAtPrice
          : parseFloat(String(variant.compareAtPrice));
    }
  }

  return result;
}
