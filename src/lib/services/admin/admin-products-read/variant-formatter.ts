/**
 * Format variant for admin product detail response.
 * Relational ProductVariantOption is the source of truth; JSONB fills gaps.
 */

import { mergeAdminVariantAttributes } from "./variant-formatter-attributes";
import type { AdminVariantOption } from "./variant-formatter-attributes";

export function formatVariantForAdmin(variant: {
  id: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  sku: string | null;
  imageUrl: string | null;
  published: boolean | null;
  attributes: unknown;
  options?: AdminVariantOption[];
}) {
  const options = Array.isArray(variant.options) ? variant.options : [];
  const merged = mergeAdminVariantAttributes({
    options,
    jsonAttributes: variant.attributes,
  });

  return {
    id: variant.id,
    price: variant.price.toString(),
    compareAtPrice: variant.compareAtPrice?.toString() || "",
    stock: variant.stock.toString(),
    sku: variant.sku || "",
    color: merged.color,
    size: merged.size,
    imageUrl: variant.imageUrl || "",
    published: variant.published || false,
    attributes: merged.attributes,
    options,
    colorValues: merged.colorValues,
    sizeValues: merged.sizeValues,
  };
}
