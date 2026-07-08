import { describe, expect, it } from 'vitest';
import {
  assertVariantPurchasable,
  hasDisplayPrice,
  minPricedVariantPrice,
  pickListingPriceVariant,
} from './variant-price-display';

describe('variant-price-display', () => {
  it('hasDisplayPrice is false for priceOnRequest', () => {
    expect(hasDisplayPrice({ price: 100, priceOnRequest: true })).toBe(false);
  });

  it('hasDisplayPrice is false for zero price without flag', () => {
    expect(hasDisplayPrice({ price: 0, priceOnRequest: false })).toBe(false);
  });

  it('hasDisplayPrice is true for positive priced variant', () => {
    expect(hasDisplayPrice({ price: 99.5, priceOnRequest: false })).toBe(true);
  });

  it('pickListingPriceVariant skips no-price variants', () => {
    const picked = pickListingPriceVariant([
      { price: 0, priceOnRequest: true },
      { price: 50, priceOnRequest: false },
    ]);
    expect(picked?.price).toBe(50);
  });

  it('minPricedVariantPrice ignores no-price variants', () => {
    expect(
      minPricedVariantPrice([
        { price: 0, priceOnRequest: true },
        { price: 120, priceOnRequest: false },
      ]),
    ).toBe(120);
  });

  it('assertVariantPurchasable throws for priceOnRequest', () => {
    expect(() => assertVariantPurchasable({ price: 0, priceOnRequest: true })).toThrow();
  });
});
