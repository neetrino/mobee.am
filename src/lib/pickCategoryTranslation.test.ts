import { describe, expect, it } from 'vitest';
import { containsArmenianScript, pickCategoryTranslation } from './pickCategoryTranslation';

describe('pickCategoryTranslation', () => {
  const translations = [
    { locale: 'en', title: 'Phones' },
    { locale: 'hy', title: 'Հեռախոս' },
    { locale: 'ru', title: 'Телефоны' },
  ];

  it('returns the requested locale when available', () => {
    expect(pickCategoryTranslation(translations, 'hy')?.title).toBe('Հեռախոս');
  });

  it('falls back to english for unsupported locales', () => {
    expect(pickCategoryTranslation(translations, 'ka')?.title).toBe('Phones');
  });

  it('falls back to english before other translations', () => {
    const englishOnly = [{ locale: 'en', title: 'Tablets' }];
    expect(pickCategoryTranslation(englishOnly, 'ru')?.title).toBe('Tablets');
  });

  it('does not inject Armenian into english UI when en title is missing', () => {
    const hyOnly = [{ locale: 'hy', title: 'Վարսահարդարիչներ' }];
    expect(pickCategoryTranslation(hyOnly, 'en')).toBeUndefined();
    expect(pickCategoryTranslation(hyOnly, 'ru')).toBeUndefined();
  });

  it('rejects Armenian text stored under the en locale', () => {
    const badEn = [
      { locale: 'en', title: 'Վարսահարդարիչներ' },
      { locale: 'hy', title: 'Վարսահարդարիչներ' },
    ];
    expect(pickCategoryTranslation(badEn, 'en')).toBeUndefined();
  });

  it('keeps Armenian fallback only for Armenian UI', () => {
    const hyOnly = [{ locale: 'hy', title: 'Վարսահարդարիչներ' }];
    expect(pickCategoryTranslation(hyOnly, 'hy')?.title).toBe('Վարսահարդարիչներ');
  });

  it('rejects empty titles so blank EN/RU rows do not win', () => {
    const withEmptyEn = [
      { locale: 'en', title: '' },
      { locale: 'hy', title: 'Հեռախոս' },
    ];
    expect(pickCategoryTranslation(withEmptyEn, 'en')).toBeUndefined();
  });

  it('detects Armenian script', () => {
    expect(containsArmenianScript('Վարսահարդարիչներ')).toBe(true);
    expect(containsArmenianScript('Hair dryers')).toBe(false);
  });
});
