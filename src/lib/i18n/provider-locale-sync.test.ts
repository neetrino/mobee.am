import { describe, expect, it } from 'vitest';
import {
  resolveStorefrontUiLanguage,
  shouldApplyServerCategoriesSnapshot,
  shouldApplyServerProductSnapshot,
} from './provider-locale-sync';

describe('provider locale sync', () => {
  it('uses the URL locale without requiring a remount', () => {
    expect(resolveStorefrontUiLanguage('/ru/shop', 'hy')).toBe('ru');
    expect(resolveStorefrontUiLanguage('/en/products/iphone', 'hy')).toBe('en');
  });

  it('falls back when the path has no locale prefix', () => {
    expect(resolveStorefrontUiLanguage('/supersudo/products', 'hy')).toBe('hy');
  });

  it('applies server categories when locale-bound props arrive', () => {
    expect(shouldApplyServerCategoriesSnapshot([{ id: '1' }], 'ru')).toBe(true);
    expect(shouldApplyServerCategoriesSnapshot(undefined, 'ru')).toBe(false);
    expect(shouldApplyServerCategoriesSnapshot([], 'ru')).toBe(false);
    expect(shouldApplyServerCategoriesSnapshot([], undefined)).toBe(false);
  });

  it('does not keep a stale product snapshot after the locale changes', () => {
    expect(shouldApplyServerProductSnapshot(true, 'ru', 'ru')).toBe(true);
    expect(shouldApplyServerProductSnapshot(true, 'hy', 'ru')).toBe(false);
    expect(shouldApplyServerProductSnapshot(false, 'ru', 'ru')).toBe(false);
  });
});
