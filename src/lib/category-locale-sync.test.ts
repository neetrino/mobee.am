import { describe, expect, it } from 'vitest';
import { categoryLocaleTitlesToWrite } from './category-locale-sync';

describe('categoryLocaleTitlesToWrite', () => {
  it('writes hy/en/ru for known Armenian titles', () => {
    expect(categoryLocaleTitlesToWrite('Հեռախոս')).toEqual([
      { locale: 'hy', title: 'Հեռախոս' },
      { locale: 'en', title: 'Phones' },
      { locale: 'ru', title: 'Телефоны' },
    ]);
  });

  it('keeps hy-only when there is no EN/RU mapping', () => {
    expect(categoryLocaleTitlesToWrite('Նոր կատեգորիա')).toEqual([
      { locale: 'hy', title: 'Նոր կատեգորիա' },
    ]);
  });
});
