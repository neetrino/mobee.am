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

/** Optional variant selector data; used to skip variants the PDP cannot select. */
export type VariantSelectorFields = {
  options?: readonly unknown[] | null;
  attributes?: unknown;
};

function hasSelectorData(variant: VariantSelectorFields): boolean {
  if (Array.isArray(variant.options) && variant.options.length > 0) return true;
  const attrs = variant.attributes;
  return Boolean(attrs) && typeof attrs === 'object' && Object.keys(attrs as object).length > 0;
}

/**
 * Variants that participate in listing price: when some variants carry options/attributes,
 * option-less leftovers are unselectable on the PDP and must not drive the card price.
 */
export function selectablePriceVariants<T extends VariantSelectorFields>(variants: T[]): T[] {
  const selectable = variants.filter(hasSelectorData);
  return selectable.length > 0 ? selectable : variants;
}

/** Cheapest selectable variant with a real price; null if none. */
export function pickListingPriceVariant<T extends VariantPriceFields & VariantSelectorFields>(
  variants: T[],
  preferred?: T | null,
): T | null {
  if (preferred && hasDisplayPrice(preferred)) return preferred;
  const priced = selectablePriceVariants(variants).filter(hasDisplayPrice);
  if (priced.length === 0) return null;
  return [...priced].sort((a, b) => (a.price ?? 0) - (b.price ?? 0))[0];
}

/** Minimum list price among selectable priced variants, or null. */
export function minPricedVariantPrice(
  variants: Array<VariantPriceFields & VariantSelectorFields>,
): number | null {
  const priced = selectablePriceVariants(variants).filter(hasDisplayPrice);
  if (priced.length === 0) return null;
  return Math.min(...priced.map((v) => v.price as number));
}

/** Sort key for price sorts — no-price products sort last. */
export function listPriceSortKey(
  variants: Array<VariantPriceFields & VariantSelectorFields>,
): number {
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
