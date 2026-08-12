import { describe, expect, it } from 'vitest';
import { localizeCategoryTitle, resolveLocalizedCategoryFields } from './category-title-i18n';

describe('category-title-i18n', () => {
  it('maps Armenian source titles to EN/RU', () => {
    expect(localizeCategoryTitle('Հեռուստացույց', 'en')).toBe('TVs');
    expect(localizeCategoryTitle('Լվացքի մեքենա', 'ru')).toBe('Стиральные машины');
    expect(localizeCategoryTitle('Օդորակիչ', 'en')).toBe('Air conditioners');
  });

  it('uses hy title when en/ru rows are empty', () => {
    const translations = [
      { locale: 'en', title: '', slug: '' },
      { locale: 'ru', title: '', slug: '' },
      { locale: 'hy', title: 'Սառնարան', slug: 'sarnaran' },
    ];

    expect(resolveLocalizedCategoryFields(translations, 'en')).toEqual({
      title: 'Refrigerators',
      slug: 'sarnaran',
      fullPath: 'sarnaran',
    });
    expect(resolveLocalizedCategoryFields(translations, 'ru')?.title).toBe('Холодильники');
  });

  it('keeps existing non-empty EN titles', () => {
    const translations = [
      { locale: 'en', title: 'Computers', slug: 'computers' },
      { locale: 'hy', title: 'Համակարգիչ', slug: 'hamakargich' },
    ];

    expect(resolveLocalizedCategoryFields(translations, 'en')).toEqual({
      title: 'Computers',
      slug: 'computers',
      fullPath: 'computers',
    });
  });
});
