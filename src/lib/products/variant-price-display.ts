/** Variant fields used to decide whether a price is shown or purchasable. */
export type VariantPriceFields = {
  price?: number | null;
  priceOnRequest?: boolean | null;
};

/** True when the variant has a real customer-facing price (not on-request / zero sentinel). */
export function hasDisplayPrice(variant: VariantPriceFields | null | undefined): boolean {
  if (!variant || variant.priceOnRequest === true) return false;
  const p = variant.price;
  return typeof p === 'number' && Number.isFinite(p) && p > 0;
}

/** Alias — purchasable items must have a display price. */
export function hasPurchasablePrice(variant: VariantPriceFields | null | undefined): boolean {
  return hasDisplayPrice(variant);
}

/** Cheapest variant with a real price; null if none. */
export function pickListingPriceVariant<T extends VariantPriceFields>(
  variants: T[],
  preferred?: T | null,
): T | null {
  if (preferred && hasDisplayPrice(preferred)) return preferred;
  const priced = variants.filter(hasDisplayPrice);
  if (priced.length === 0) return null;
  return [...priced].sort((a, b) => (a.price ?? 0) - (b.price ?? 0))[0];
}

/** Minimum list price among priced variants, or null. */
export function minPricedVariantPrice(variants: VariantPriceFields[]): number | null {
  const priced = variants.filter(hasDisplayPrice);
  if (priced.length === 0) return null;
  return Math.min(...priced.map((v) => v.price as number));
}

/** Sort key for price sorts — no-price products sort last. */
export function listPriceSortKey(variants: VariantPriceFields[]): number {
  const min = minPricedVariantPrice(variants);
  return min ?? Number.POSITIVE_INFINITY;
}

export const PRICE_UNAVAILABLE_DETAIL =
  'This product is not available for purchase online. Please contact us for pricing.';

export type PriceValidationError = {
  status: number;
  type: string;
  title: string;
  detail: string;
};

/** Throws a 422 validation error when variant cannot be purchased. */
export function assertVariantPurchasable(
  variant: VariantPriceFields | null | undefined,
): void {
  if (!hasPurchasablePrice(variant)) {
    const err: PriceValidationError = {
      status: 422,
      type: 'https://api.shop.am/problems/validation-error',
      title: 'Price unavailable',
      detail: PRICE_UNAVAILABLE_DETAIL,
    };
    throw err;
  }
}

/** Validates cart line snapshot + linked variant before checkout. */
export function assertCartLinePurchasable(item: {
  priceSnapshot?: number | null;
  variant?: VariantPriceFields | null;
}): void {
  if (item.variant) {
    assertVariantPurchasable(item.variant);
  }
  const snap = item.priceSnapshot;
  if (typeof snap !== 'number' || !Number.isFinite(snap) || snap <= 0) {
    const err: PriceValidationError = {
      status: 422,
      type: 'https://api.shop.am/problems/validation-error',
      title: 'Price unavailable',
      detail: PRICE_UNAVAILABLE_DETAIL,
    };
    throw err;
  }
}
