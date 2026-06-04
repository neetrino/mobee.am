import { convertPrice } from '../currency';

export interface CartTotalsForAmd {
  subtotal: number;
  discount: number;
  currency?: string;
}

/** Cart line subtotal minus discount, in AMD (matches checkout server totals). */
export function getCartSubtotalAfterDiscountAmd(totals: CartTotalsForAmd): number {
  const net = Math.max(0, totals.subtotal - totals.discount);
  if (totals.currency === 'AMD' || totals.currency === undefined) {
    return net;
  }
  const sub = convertPrice(totals.subtotal, 'USD', 'AMD');
  const disc = convertPrice(totals.discount, 'USD', 'AMD');
  return Math.max(0, sub - disc);
}
