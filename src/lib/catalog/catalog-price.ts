import {
  computeEffectiveVariantPrice,
  resolveAppliedDiscountPercent,
} from "@/lib/services/products-effective-price";
import type { ProductDiscountContext } from "@/lib/services/products-find-transform.service";
import { hasDisplayPrice } from "@/lib/products/variant-price-display";
import type { CatalogLightRow } from "./catalog-light.types";

/**
 * Canonical listing price: min effective published-variant price.
 * Matches product cards and the price slider (not raw variant.price).
 */
export function catalogListingPrice(
  row: CatalogLightRow,
  discounts: ProductDiscountContext,
): number | null {
  const variants = Array.isArray(row.variants) ? row.variants : [];
  const discountPercent = resolveAppliedDiscountPercent(row, discounts);
  let min: number | null = null;

  for (const variant of variants) {
    if (!hasDisplayPrice(variant)) {
      continue;
    }
    const effective = computeEffectiveVariantPrice(variant.price, discountPercent);
    if (!Number.isFinite(effective)) {
      continue;
    }
    if (min === null || effective < min) {
      min = effective;
    }
  }

  return min;
}

export function rowMatchesPriceFilter(
  row: CatalogLightRow,
  discounts: ProductDiscountContext,
  minPrice?: number,
  maxPrice?: number,
): boolean {
  if (minPrice === undefined && maxPrice === undefined) {
    return true;
  }
  const listMin = catalogListingPrice(row, discounts);
  if (listMin === null) {
    return false;
  }
  if (minPrice !== undefined && listMin < minPrice) {
    return false;
  }
  if (maxPrice !== undefined && listMin > maxPrice) {
    return false;
  }
  return true;
}
