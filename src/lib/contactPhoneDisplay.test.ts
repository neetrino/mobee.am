import { describe, expect, it } from 'vitest';
import { phoneDisplayToTelHref, splitContactPhoneDisplay } from './contactPhoneDisplay';

describe('splitContactPhoneDisplay', () => {
  it('splits on newlines and trims', () => {
    expect(splitContactPhoneDisplay(' 093-1 \n055-2\n')).toEqual(['093-1', '055-2']);
  });

  it('returns empty for blank input', () => {
    expect(splitContactPhoneDisplay('  \n  ')).toEqual([]);
  });
});

describe('phoneDisplayToTelHref', () => {
  it('maps Armenian national 0XX to +374', () => {
    expect(phoneDisplayToTelHref('093-44-44-94')).toBe('tel:+37493444494');
    expect(phoneDisplayToTelHref('055-81-11-81')).toBe('tel:+37455811181');
  });

  it('keeps existing +374 digit form', () => {
    expect(phoneDisplayToTelHref('+374 93 444 494')).toBe('tel:+37493444494');
  });
});
