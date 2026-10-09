import { describe, expect, it } from 'vitest';
import type { GeneratedVariant } from '../types';
import { setMainVariant } from './mainVariant';

function variant(id: string, isMain?: boolean): GeneratedVariant {
  return {
    id,
    selectedValueIds: [],
    price: '',
    compareAtPrice: '',
    stock: '',
    sku: '',
    images: [],
    isMain,
  };
}

describe('setMainVariant', () => {
  it('marks only the chosen variant as main', () => {
    const result = setMainVariant([variant('a', true), variant('b'), variant('c')], 'b', true);
    expect(result.map((item) => item.isMain)).toEqual([false, true, false]);
  });

  it('clears main when the chosen variant is unchecked', () => {
    const result = setMainVariant([variant('a'), variant('b', true)], 'b', false);
    expect(result.map((item) => item.isMain)).toEqual([false, false]);
  });
});
