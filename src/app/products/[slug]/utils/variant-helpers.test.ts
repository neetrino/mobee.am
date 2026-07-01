import { describe, expect, it } from 'vitest';
import { variantHasColor } from './variant-helpers';
import type { Product, ProductVariant } from '../types';

const blackVariant: ProductVariant = {
  id: 'v-black',
  sku: 'black',
  price: 100,
  stock: 5,
  available: true,
  options: [
    {
      key: 'color',
      attribute: 'color',
      value: 'սև',
      valueId: 'color-black-id',
    },
  ],
};

const productWithCanonicalColors: Product = {
  id: 'p1',
  slug: 'iphone-17e',
  title: 'iPhone 17e',
  variants: [blackVariant],
  productAttributes: [
    {
      id: 'pa1',
      attribute: {
        id: 'attr-color',
        key: 'color',
        name: 'Color',
        values: [
          {
            id: 'color-black-id',
            value: 'black',
            label: 'Սև',
          },
        ],
      },
    },
  ],
} as Product;

describe('variantHasColor', () => {
  it('matches canonical color token from listing cards against localized option labels', () => {
    expect(variantHasColor(blackVariant, 'black', productWithCanonicalColors)).toBe(true);
  });

  it('still matches localized option labels directly', () => {
    expect(variantHasColor(blackVariant, 'սև', productWithCanonicalColors)).toBe(true);
  });
});
