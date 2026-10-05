import { describe, expect, it } from 'vitest';
import type { GeneratedVariant } from '../types';
import { buildVariantSku, nextVariantSku, resyncVariantSkus } from './variantSku';

const variant = (sku: string): GeneratedVariant => ({
  id: sku || 'empty',
  selectedValueIds: [],
  price: '',
  compareAtPrice: '',
  stock: '',
  sku,
  images: [],
});

describe('variantSku', () => {
  it('builds positional SKU from slug', () => {
    expect(buildVariantSku('iphone-15', 2)).toBe('iphone-15-2');
    expect(buildVariantSku('  ', 1)).toBe('');
  });

  it('picks next free position', () => {
    expect(nextVariantSku('phone', [])).toBe('phone-1');
    expect(nextVariantSku('phone', [variant('phone-1'), variant('phone-3')])).toBe('phone-4');
    expect(nextVariantSku('phone', [variant('phone-1'), variant('custom')])).toBe('phone-3');
  });

  it('resyncs only auto-generated SKUs', () => {
    const result = resyncVariantSkus([variant('ph-1'), variant(''), variant('MANUAL'), variant('ph-7')], 'ph', 'phone');
    expect(result.map((v) => v.sku)).toEqual(['phone-1', 'phone-2', 'MANUAL', 'phone-7']);
  });
});
