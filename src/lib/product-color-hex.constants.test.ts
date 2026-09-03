import { describe, expect, it } from 'vitest';
import {
  getProductColorHex,
  getProductColorHexes,
  isKnownProductColor,
  resolveProductSwatchHexes,
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

  it('uses Dyson CMF HEX instead of generic hue tokens', () => {
    expect(getProductColorHex('Ceramic Pink')).toBe('#E8B4B8');
    expect(getProductColorHex('Ceramic Pink')).not.toBe(getProductColorHex('pink'));
    expect(getProductColorHex('Prussian Blue')).toBe('#003153');
    expect(getProductColorHex('Prussian Blue')).not.toBe(getProductColorHex('blue'));
    expect(getProductColorHex('Jasper Plum')).toBe('#6B3A5C');
    expect(getProductColorHex('Sakura Cherry')).toBe('#E8A0B4');
    expect(getProductColorHex('Ceramic Patina')).toBe('#8B9A8C');
    expect(getProductColorHex('Amber Silk')).toBe('#C9A26B');
    expect(getProductColorHex('Kanzan Pink')).not.toBe(getProductColorHex('pink'));
  });

  it('strips Samsung marketing prefixes to the real hue', () => {
    expect(getProductColorHex('Phantom Violet')).toBe(getProductColorHex('violet'));
    expect(getProductColorHex('Awesome Lime')).toBe(getProductColorHex('lime'));
    expect(getProductColorHex('Awesome Graphite')).toBe(getProductColorHex('graphite'));
  });

  it('falls back to gray only for unknown names', () => {
    expect(getProductColorHex('unobtainium glow')).toBe('#CCCCCC');
  });
});

describe('getProductColorHexes', () => {
  it('returns dual-tone HEX for Dyson compound finishes', () => {
    expect(getProductColorHexes('Vinca Blue / Topaz')).toEqual(['#6B8CB4', '#D4A05A']);
    expect(getProductColorHexes('Nickel / Copper')).toEqual(['#A8A9AD', '#B87333']);
    expect(getProductColorHexes('Red Velvet / Gold')).toEqual(['#8B1E2D', '#C9A962']);
  });
});

describe('resolveProductSwatchHexes', () => {
  it('overrides stored generic HEX when the name is a Dyson finish', () => {
    expect(
      resolveProductSwatchHexes({
        names: ['Ceramic Pink'],
        stored: ['#FADDD7'],
      }),
    ).toEqual(['#E8B4B8']);
  });

  it('keeps stored HEX for non-Dyson names', () => {
    expect(
      resolveProductSwatchHexes({
        names: ['Blue Shadow'],
        stored: ['#276787'],
      }),
    ).toEqual(['#276787']);
  });
});

describe('isKnownProductColor', () => {
  it('treats translated labels as known colors', () => {
    expect(isKnownProductColor('blue')).toBe(true);
    expect(isKnownProductColor('Կապույտ')).toBe(true);
    expect(isKnownProductColor('Синий')).toBe(true);
    expect(isKnownProductColor('Titanium Black')).toBe(true);
    expect(isKnownProductColor('Ceramic Pink')).toBe(true);
    expect(isKnownProductColor('unobtainium glow')).toBe(false);
  });
});
