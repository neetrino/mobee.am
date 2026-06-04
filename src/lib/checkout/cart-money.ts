import { convertPrice, type CurrencyCode } from '../currency';
import type { CartTotalsForAmd } from './cart-subtotal-amd.types';

/** Catalog/cart line amounts are stored in USD (see admin product save). */
export const CART_MONEY_BASE_CURRENCY = 'USD' as const;

export function cartTotalsNetInBase(totals: CartTotalsForAmd): number {
  return Math.max(0, totals.subtotal - totals.discount);
}

/** AMD value for delivery rules, shipping API, and order totals. */
export function cartTotalsToAmd(totals: CartTotalsForAmd): number {
  return convertPrice(cartTotalsNetInBase(totals), CART_MONEY_BASE_CURRENCY, 'AMD');
}

/**
 * Same number as `formatPrice(cartTotalsNetInBase(totals), displayCurrency)` before formatting.
 */
export function cartTotalsToDisplayCurrency(
  totals: CartTotalsForAmd,
  displayCurrency: CurrencyCode
): number {
  return convertPrice(cartTotalsNetInBase(totals), CART_MONEY_BASE_CURRENCY, displayCurrency);
}

export function cartAmountToDisplayCurrency(
  amountInBase: number,
  displayCurrency: CurrencyCode
): number {
  return convertPrice(amountInBase, CART_MONEY_BASE_CURRENCY, displayCurrency);
}
