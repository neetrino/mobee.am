import { describe, expect, it } from 'vitest';
import { localizeProductTitle } from './product-title-i18n';

describe('localizeProductTitle', () => {
  it('keeps Armenian titles on hy', () => {
    expect(localizeProductTitle('Լվացքի մեքենա Hisense WF1', 'hy')).toBe(
      'Լվացքի մեքենա Hisense WF1',
    );
  });

  it('translates known Armenian prefixes on en/ru', () => {
    expect(localizeProductTitle('Լվացքի մեքենա Hisense WF1', 'en')).toBe(
      'Washing machine Hisense WF1',
    );
    expect(localizeProductTitle('Սառնարան HISENSE RD39', 'ru')).toBe(
      'Холодильник HISENSE RD39',
    );
  });

  it('leaves Latin brand/model titles unchanged', () => {
    expect(localizeProductTitle('iPhone 18 Pro Max', 'en')).toBe('iPhone 18 Pro Max');
    expect(localizeProductTitle('Apple Watch Series 12', 'ru')).toBe(
      'Apple Watch Series 12',
    );
  });

  it('returns unknown Armenian titles unchanged', () => {
    expect(localizeProductTitle('թեստ', 'en')).toBe('թեստ');
  });
});
