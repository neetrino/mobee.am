import { describe, expect, it } from 'vitest';
import { cartTotalsToAmd, cartTotalsToDisplayCurrency } from './cart-money';

describe('cart-money', () => {
  it('converts USD cart totals to AMD for display rules (rate 400)', () => {
    const totals = { subtotal: 137.5, discount: 0, currency: 'USD' };
    expect(cartTotalsToAmd(totals)).toBe(55_000);
    expect(cartTotalsToDisplayCurrency(totals, 'AMD')).toBe(55_000);
  });

  it('matches formatPrice-style display for other currencies', () => {
    const totals = { subtotal: 100, discount: 0, currency: 'USD' };
    expect(cartTotalsToDisplayCurrency(totals, 'USD')).toBe(100);
  });
});
