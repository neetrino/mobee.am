import { describe, expect, it } from 'vitest';
import { pickSwatchFromVariantOptions } from './swatch-from-variant-options';
import type { ProductVariant } from '../types';

const variantWithBlue: ProductVariant = {
  id: 'v1',
  sku: 'sku-1',
  price: 10,
  stock: 2,
  available: true,
  options: [
    {
      key: 'color',
      attribute: 'color',
      value: 'blue',
      valueId: 'color-blue',
      colors: ['#276787'],
      imageUrl: null,
    },
  ],
};

describe('pickSwatchFromVariantOptions', () => {
  it('reads hex colors from the matching variant option', () => {
    expect(pickSwatchFromVariantOptions([variantWithBlue], 'color-blue', 'blue')).toEqual({
      imageUrl: null,
      colors: ['#276787'],
    });
  });

  it('matches by canonical value when valueId is missing', () => {
    expect(pickSwatchFromVariantOptions([variantWithBlue], undefined, 'Blue')).toEqual({
      imageUrl: null,
      colors: ['#276787'],
    });
  });
});
