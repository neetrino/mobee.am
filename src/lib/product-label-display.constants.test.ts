import { describe, expect, it } from 'vitest';
import {
  getProductLabelDisplayI18nKey,
  resolveKnownProductLabelKind,
} from './product-label-display.constants';

describe('product label display localization', () => {
  it('maps known badge values across locales to kinds', () => {
    expect(resolveKnownProductLabelKind('Նոր')).toBe('new');
    expect(resolveKnownProductLabelKind('New')).toBe('new');
    expect(resolveKnownProductLabelKind('Զեղչ')).toBe('sale');
    expect(resolveKnownProductLabelKind('Sale')).toBe('sale');
    expect(resolveKnownProductLabelKind('տաք')).toBe('hot');
    expect(resolveKnownProductLabelKind('Limited')).toBeNull();
  });

  it('returns i18n keys for known badges only', () => {
    expect(getProductLabelDisplayI18nKey('նոր')).toBe('common.productLabels.new');
    expect(getProductLabelDisplayI18nKey('Limited')).toBeNull();
  });
});
