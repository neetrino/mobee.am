import { describe, expect, it } from 'vitest';
import {
  parseListingColorFilter,
  resolveProductCardLinkColor,
} from './listing-color-link';

describe('parseListingColorFilter', () => {
  it('parses comma-separated colors', () => {
    expect(parseListingColorFilter('Black, Silver')).toEqual(['black', 'silver']);
  });
});

describe('resolveProductCardLinkColor', () => {
  it('returns matching product color from active filters', () => {
    const color = resolveProductCardLinkColor(
      [{ value: 'Midnight', linkValue: 'midnight' }, { value: 'Silver', linkValue: 'silver' }],
      ['black', 'midnight'],
    );
    expect(color).toBe('midnight');
  });

  it('matches filters via linkValue when display label differs', () => {
    const color = resolveProductCardLinkColor(
      [{ value: 'Սև', linkValue: 'black' }],
      ['black'],
    );
    expect(color).toBe('black');
  });

  it('returns single active filter when product colors are unknown', () => {
    expect(resolveProductCardLinkColor([], ['black'])).toBe('black');
  });

  it('returns null when multiple filters and no product match', () => {
    expect(resolveProductCardLinkColor([{ value: 'blue' }], ['black', 'silver'])).toBeNull();
  });
});
