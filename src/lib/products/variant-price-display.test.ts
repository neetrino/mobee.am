import { describe, expect, it } from 'vitest';
import {
  assertVariantPurchasable,
  hasDisplayPrice,
  listPriceSortKey,
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

  it('ignores option-less variants when selectable variants exist', () => {
    const variants = [
      { price: 560, options: [], attributes: null },
      { price: 1062.25, options: [{ key: 'color' }], attributes: null },
      { price: 1080, options: [], attributes: { color: 'Grey' } },
    ];
    expect(minPricedVariantPrice(variants)).toBe(1062.25);
    expect(pickListingPriceVariant(variants)?.price).toBe(1062.25);
  });

  it('falls back to all variants when none carry options', () => {
    expect(minPricedVariantPrice([{ price: 300 }, { price: 200 }])).toBe(200);
  });

  it('pickListingPriceVariant prefers the main variant over the cheapest', () => {
    const picked = pickListingPriceVariant([
      { price: 100 },
      { price: 300, isMain: true },
    ]);
    expect(picked?.price).toBe(300);
  });

  it('pickListingPriceVariant keeps an out-of-stock main variant', () => {
    const picked = pickListingPriceVariant([
      { price: 100, stock: 5 },
      { price: 300, stock: 0, isMain: true },
    ]);
    expect(picked?.price).toBe(300);
  });

  it('pickListingPriceVariant ignores an unpublished or unpriced main variant', () => {
    expect(pickListingPriceVariant([{ price: 100 }, { price: 300, isMain: true, published: false }])?.price).toBe(100);
    expect(pickListingPriceVariant([{ price: 100 }, { price: 0, isMain: true }])?.price).toBe(100);
  });

  it('pickListingPriceVariant lets the preferred (color filter) variant win over main', () => {
    const preferred = { price: 200 };
    const picked = pickListingPriceVariant([{ price: 300, isMain: true }, preferred], preferred);
    expect(picked).toBe(preferred);
  });

  it('listPriceSortKey follows the card price', () => {
    expect(listPriceSortKey([{ price: 100 }, { price: 300, isMain: true }])).toBe(300);
    expect(listPriceSortKey([{ price: 0, priceOnRequest: true }])).toBe(Number.POSITIVE_INFINITY);
  });

  it('assertVariantPurchasable throws for priceOnRequest', () => {
    expect(() => assertVariantPurchasable({ price: 0, priceOnRequest: true })).toThrow();
  });
});
