import { describe, expect, it } from 'vitest';
import {
  getProductColorHex,
  isKnownProductColor,
} from './product-color-hex.constants';

describe('getProductColorHex', () => {
  it('resolves English color names', () => {
    expect(getProductColorHex('blue')).toBe('#276787');
    expect(getProductColorHex('space black')).toBe('#1D1D1F');
  });

  it('resolves Armenian and Russian labels instead of gray fallback', () => {
    expect(getProductColorHex('Կապույտ')).toBe(getProductColorHex('blue'));
    expect(getProductColorHex('Синий')).toBe(getProductColorHex('blue'));
    expect(getProductColorHex('Կարմիր')).toBe(getProductColorHex('red'));
    expect(getProductColorHex('Красный')).toBe(getProductColorHex('red'));
  });

  it('passes through valid hex values', () => {
    expect(getProductColorHex('#FF0000')).toBe('#ff0000');
    expect(getProductColorHex('#abc')).toBe('#aabbcc');
  });

  it('falls back to gray only for unknown names', () => {
    expect(getProductColorHex('jasper plum')).toBe('#CCCCCC');
  });
});

describe('isKnownProductColor', () => {
  it('treats translated labels as known colors', () => {
    expect(isKnownProductColor('blue')).toBe(true);
    expect(isKnownProductColor('Կապույտ')).toBe(true);
    expect(isKnownProductColor('Синий')).toBe(true);
    expect(isKnownProductColor('jasper plum')).toBe(false);
  });
});
