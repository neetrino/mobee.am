import { describe, expect, it } from 'vitest';
import {
  getProductColorHex,
  isKnownProductColor,
} from './product-color-hex.constants';

describe('getProductColorHex', () => {
  it('resolves English color names', () => {
    expect(getProductColorHex('blue')).toBe('#276787');
    expect(getProductColorHex('space black')).toBe('#1D1D1F');
    expect(getProductColorHex('Jetblack')).toBe('#0A0A0A');
    expect(getProductColorHex('Blue Shadow')).toBe('#5C6E7A');
    expect(getProductColorHex('Silver Shadow')).toBe('#C8C9CE');
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

  it('resolves marketing names like Titanium Black instead of gray fallback', () => {
    expect(getProductColorHex('Titanium Black')).toBe(getProductColorHex('black titanium'));
    expect(getProductColorHex('Titanium Blue')).toBe(getProductColorHex('blue titanium'));
    expect(getProductColorHex('Titanium Silver')).toBe(getProductColorHex('silver titanium'));
    expect(getProductColorHex('Titanium Gray')).toBe(getProductColorHex('gray titanium'));
    expect(getProductColorHex('Titanium Black')).not.toBe(getProductColorHex('Titanium Blue'));
    expect(getProductColorHex('Titanium Blue')).not.toBe(getProductColorHex('Titanium Gray'));
  });

  it('strips Samsung marketing prefixes to the real hue', () => {
    expect(getProductColorHex('Phantom Violet')).toBe(getProductColorHex('violet'));
    expect(getProductColorHex('Awesome Lime')).toBe(getProductColorHex('lime'));
    expect(getProductColorHex('Awesome Graphite')).toBe(getProductColorHex('graphite'));
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
    expect(isKnownProductColor('Titanium Black')).toBe(true);
    expect(isKnownProductColor('jasper plum')).toBe(false);
  });
});
