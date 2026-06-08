import { describe, expect, it } from 'vitest';
import { pickCategoryTranslation } from './pickCategoryTranslation';

describe('pickCategoryTranslation', () => {
  const translations = [
    { locale: 'en', title: 'Phones' },
    { locale: 'hy', title: 'Հեռախոս' },
    { locale: 'ru', title: 'Телефоны' },
  ];

  it('returns the requested locale when available', () => {
    expect(pickCategoryTranslation(translations, 'hy')?.title).toBe('Հեռախոս');
  });

  it('falls back to default storefront language', () => {
    expect(pickCategoryTranslation(translations, 'ka')?.title).toBe('Հեռախոս');
  });

  it('falls back to english before the first translation', () => {
    const englishOnly = [{ locale: 'en', title: 'Tablets' }];
    expect(pickCategoryTranslation(englishOnly, 'ru')?.title).toBe('Tablets');
  });
});
