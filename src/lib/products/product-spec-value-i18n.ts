import type { LanguageCode } from '../language';

const YES_NO_CANONICAL: Readonly<Record<string, 'yes' | 'no'>> = {
  այո: 'yes',
  ոչ: 'no',
  yes: 'yes',
  no: 'no',
  да: 'yes',
  нет: 'no',
  კი: 'yes',
  არა: 'no',
};

const YES_NO_BY_LOCALE: Readonly<Record<LanguageCode, Readonly<Record<'yes' | 'no', string>>>> = {
  hy: { yes: 'Այո', no: 'Ոչ' },
  en: { yes: 'Yes', no: 'No' },
  ru: { yes: 'Да', no: 'Нет' },
  ka: { yes: 'კი', no: 'არა' },
};

/**
 * Localizes safe spec values (yes/no only). Technical tokens are returned unchanged.
 */
export function translateSpecValue(lang: LanguageCode | undefined, value: string): string {
  if (!value.trim()) {
    return value;
  }

  const locale: LanguageCode = lang ?? 'hy';
  const canonical = YES_NO_CANONICAL[value.trim().toLowerCase()];
  if (!canonical) {
    return value;
  }

  return YES_NO_BY_LOCALE[locale][canonical];
}

export function isYesNoSpecValue(value: string): boolean {
  return YES_NO_CANONICAL[value.trim().toLowerCase()] !== undefined;
}
