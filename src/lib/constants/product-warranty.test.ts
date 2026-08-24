import { describe, expect, it } from 'vitest';
import {
  isProductWarrantyYears,
  normalizeProductWarrantyYears,
} from './product-warranty';

describe('normalizeProductWarrantyYears', () => {
  it('keeps supported years', () => {
    expect(normalizeProductWarrantyYears(1)).toBe(1);
    expect(normalizeProductWarrantyYears(2)).toBe(2);
    expect(normalizeProductWarrantyYears(3)).toBe(3);
    expect(normalizeProductWarrantyYears('2')).toBe(2);
  });

  it('maps absent and unsupported values to null', () => {
    expect(normalizeProductWarrantyYears(null)).toBeNull();
    expect(normalizeProductWarrantyYears(undefined)).toBeNull();
    expect(normalizeProductWarrantyYears('')).toBeNull();
    expect(normalizeProductWarrantyYears('none')).toBeNull();
    expect(normalizeProductWarrantyYears(0)).toBeNull();
    expect(normalizeProductWarrantyYears(4)).toBeNull();
    expect(normalizeProductWarrantyYears(5)).toBeNull();
    expect(normalizeProductWarrantyYears('lifetime')).toBeNull();
  });
});

describe('isProductWarrantyYears', () => {
  it('accepts only 1 | 2 | 3', () => {
    expect(isProductWarrantyYears(1)).toBe(true);
    expect(isProductWarrantyYears(3)).toBe(true);
    expect(isProductWarrantyYears(null)).toBe(false);
    expect(isProductWarrantyYears(5)).toBe(false);
  });
});
