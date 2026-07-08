import { describe, expect, it } from 'vitest';
import { getVariantMainImageIndex, getVariantMedia } from './variant-media';
import type { Product, ProductVariant } from '../types';

const baseProduct: Product = {
  id: 'p1',
  slug: 'iphone-test',
  title: 'iPhone Test',
  media: [{ url: 'https://r2.example/products/p1/fallback.png' }],
  variants: [{ id: 'v0', sku: 's0', price: 1, stock: 1, available: true, options: [] }],
};

const multiVariantProduct: Product = {
  ...baseProduct,
  variants: [
    { id: 'v1', sku: 's1', price: 1, stock: 1, available: true, options: [] },
    { id: 'v2', sku: 's2', price: 1, stock: 1, available: true, options: [] },
  ],
};

describe('getVariantMedia', () => {
  it('returns variant media when present (single-variant product keeps product extras)', () => {
    const variant: ProductVariant = {
      id: 'v1',
      sku: 'mc-1',
      price: 100,
      stock: 5,
      available: true,
      options: [],
      imageUrl: 'https://r2.example/products/mobilecentre/1/main.png',
      media: [
        { url: 'https://r2.example/products/mobilecentre/1/main.png' },
        { url: 'https://r2.example/products/mobilecentre/1/gallery-1.png' },
      ],
    };

    expect(getVariantMedia(baseProduct, variant)).toEqual([
      'https://r2.example/products/mobilecentre/1/main.png',
      'https://r2.example/products/mobilecentre/1/gallery-1.png',
      'https://r2.example/products/p1/fallback.png',
    ]);
  });

  it('uses variant-only gallery for multi-variant products', () => {
    const variant: ProductVariant = {
      id: 'v1',
      sku: 'mc-1',
      price: 100,
      stock: 5,
      available: true,
      options: [{ key: 'color', attribute: 'color', value: 'black' }],
      imageUrl: 'https://r2.example/products/mobilecentre/1/main.png',
      media: [
        { url: 'https://r2.example/products/mobilecentre/1/main.png' },
        { url: 'https://r2.example/products/mobilecentre/1/gallery-1.png' },
      ],
    };

    expect(getVariantMedia(multiVariantProduct, variant)).toEqual([
      'https://r2.example/products/mobilecentre/1/main.png',
      'https://r2.example/products/mobilecentre/1/gallery-1.png',
    ]);
  });

  it('falls back to product media when variant has no media', () => {
    const variant: ProductVariant = {
      id: 'v2',
      sku: 'mc-2',
      price: 100,
      stock: 5,
      available: true,
      options: [],
    };

    expect(getVariantMedia(baseProduct, variant)).toEqual([
      'https://r2.example/products/p1/fallback.png',
    ]);
  });

  it('merges product gallery when variant only has imageUrl', () => {
    const product: Product = {
      ...baseProduct,
      media: [
        { url: 'https://r2.example/products/p1/gallery-1.png' },
        { url: 'https://r2.example/products/p1/gallery-2.png' },
        { url: 'https://r2.example/products/p1/gallery-3.png' },
      ],
    };
    const variant: ProductVariant = {
      id: 'v3',
      sku: 'mc-3',
      price: 100,
      stock: 5,
      available: true,
      options: [],
      imageUrl: 'https://r2.example/products/p1/main.png',
    };

    expect(getVariantMedia(product, variant)).toEqual([
      'https://r2.example/products/p1/main.png',
      'https://r2.example/products/p1/gallery-1.png',
      'https://r2.example/products/p1/gallery-2.png',
      'https://r2.example/products/p1/gallery-3.png',
    ]);
  });

  it('splits comma-separated variant imageUrl into multiple gallery images', () => {
    const variant: ProductVariant = {
      id: 'v4',
      sku: 'mc-4',
      price: 100,
      stock: 5,
      available: true,
      options: [],
      imageUrl:
        'https://r2.example/products/p1/a.png,https://r2.example/products/p1/b.png',
    };

    expect(getVariantMedia(baseProduct, variant)).toEqual([
      'https://r2.example/products/p1/a.png',
      'https://r2.example/products/p1/b.png',
      'https://r2.example/products/p1/fallback.png',
    ]);
  });
});

describe('getVariantMainImageIndex', () => {
  it('selects imageUrl index when present in gallery', () => {
    const variant: ProductVariant = {
      id: 'v1',
      sku: 'mc-1',
      price: 100,
      stock: 5,
      available: true,
      options: [],
      imageUrl: 'https://r2.example/b.png',
    };
    const images = [
      'https://r2.example/a.png',
      'https://r2.example/b.png',
    ];

    expect(getVariantMainImageIndex(variant, images)).toBe(1);
  });
});
