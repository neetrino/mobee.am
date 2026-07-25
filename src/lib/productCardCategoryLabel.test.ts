import { describe, expect, it } from 'vitest';
import { localizeCategoryTitle } from './category-title-i18n';
import { getProductCardCategoryLineLabel } from './productCardCategoryLabel';

describe('localizeCategoryTitle', () => {
  it('translates Վարսահարդարիչներ to English', () => {
    expect(localizeCategoryTitle('Վարսահարդարիչներ', 'en')).toBe('Hair dryers');
  });

  it('keeps Armenian for hy UI', () => {
    expect(localizeCategoryTitle('Վարսահարդարիչներ', 'hy')).toBe('Վարսահարդարիչներ');
  });

  it('translates to Russian', () => {
    expect(localizeCategoryTitle('Վարսահարդարիչներ', 'ru')).toBe('Фены');
  });
});

describe('getProductCardCategoryLineLabel', () => {
  const product = {
    primaryCategoryId: 'cat-1',
    categories: [{ id: 'cat-1', title: 'Վարսահարդարիչներ' }],
  };

  it('shows English category title on english UI', () => {
    expect(getProductCardCategoryLineLabel(product, 'en')).toBe('Hair dryers');
  });

  it('keeps Armenian category titles on armenian UI', () => {
    expect(getProductCardCategoryLineLabel(product, 'hy')).toBe('Վարսահարդարիչներ');
  });
});
