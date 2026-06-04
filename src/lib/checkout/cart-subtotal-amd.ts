import { cartTotalsToAmd } from './cart-money';
import type { CartTotalsForAmd } from './cart-subtotal-amd.types';

export type { CartTotalsForAmd } from './cart-subtotal-amd.types';

/** Cart subtotal minus discount, in AMD (matches delivery price API and server checkout). */
export function getCartSubtotalAfterDiscountAmd(totals: CartTotalsForAmd): number {
  return cartTotalsToAmd(totals);
}
