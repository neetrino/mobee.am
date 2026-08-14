import { describe, expect, it } from 'vitest';
import { mapHomeBrandLogos, pickHomeBrandName } from './home-brand-logos';

describe('pickHomeBrandName', () => {
  const translations = [
    { locale: 'en', name: 'Apple' },
    { locale: 'hy', name: 'Էփլ' },
  ];

  it('uses the requested locale when present', () => {
    expect(pickHomeBrandName(translations, 'hy')).toBe('Էփլ');
  });

  it('falls back to English', () => {
    expect(pickHomeBrandName(translations, 'ru')).toBe('Apple');
  });
});

describe('mapHomeBrandLogos', () => {
  it('keeps brands that have a logo and drops empty urls', () => {
    const logos = mapHomeBrandLogos(
      [
        {
          id: '1',
          slug: 'apple',
          logoUrl: 'https://cdn.example/apple.webp',
          translations: [{ locale: 'en', name: 'Apple' }],
        },
        {
          id: '2',
          slug: 'empty',
          logoUrl: '  ',
          translations: [{ locale: 'en', name: 'Empty' }],
        },
      ],
      'en',
    );

    expect(logos).toEqual([
      {
        id: '1',
        slug: 'apple',
        name: 'Apple',
        logoUrl: 'https://cdn.example/apple.webp',
      },
    ]);
  });
});
