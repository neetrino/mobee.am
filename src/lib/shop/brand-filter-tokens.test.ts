import { describe, expect, it } from 'vitest';
import {
  brandFilterTokenMatches,
  isBrandFilterSelected,
} from './brand-filter-tokens';

describe('brandFilterTokenMatches', () => {
  const apple = { id: 'brand_1', name: 'Apple' };

  it('matches a database id', () => {
    expect(brandFilterTokenMatches('brand_1', apple)).toBe(true);
  });

  it('matches a case-insensitive name or slug from the home logo strip', () => {
    expect(brandFilterTokenMatches('apple', apple)).toBe(true);
    expect(brandFilterTokenMatches('APPLE', apple)).toBe(true);
  });

  it('does not match another brand', () => {
    expect(brandFilterTokenMatches('samsung', apple)).toBe(false);
  });
});

describe('isBrandFilterSelected', () => {
  const apple = { id: 'brand_1', name: 'Apple' };

  it('is true when the URL token is the logo slug', () => {
    expect(isBrandFilterSelected(['apple'], apple)).toBe(true);
  });

  it('is false when the token list is empty', () => {
    expect(isBrandFilterSelected([], apple)).toBe(false);
  });
});
