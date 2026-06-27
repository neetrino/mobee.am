import type { ProductDiscountContext } from "./products-find-transform.service";

type DiscountableProduct = {
  discountPercent?: number | null;
  primaryCategoryId?: string | null;
  brandId?: string | null;
};

export function resolveAppliedDiscountPercent(
  product: DiscountableProduct,
  discounts: ProductDiscountContext,
): number {
  const productDiscount = product.discountPercent || 0;
  if (productDiscount > 0) return productDiscount;

  const categoryId = product.primaryCategoryId;
  if (categoryId && discounts.categoryDiscounts[categoryId]) {
    return discounts.categoryDiscounts[categoryId];
  }

  const brandId = product.brandId;
  if (brandId && discounts.brandDiscounts[brandId]) {
    return discounts.brandDiscounts[brandId];
  }

  return discounts.globalDiscount > 0 ? discounts.globalDiscount : 0;
}

/** Final customer price — same rules as product list cards. */
export function computeEffectiveVariantPrice(
  variantPrice: number,
  appliedDiscountPercent: number,
): number {
  if (!Number.isFinite(variantPrice)) return variantPrice;
  if (appliedDiscountPercent <= 0 || variantPrice <= 0) return variantPrice;
  return variantPrice * (1 - appliedDiscountPercent / 100);
}
