import { parseLocaleFromPathname } from '@/lib/i18n/routing';
import type { LanguageCode } from '@/lib/language';

export function resolveStorefrontUiLanguage(
  pathname: string | null | undefined,
  fallback: LanguageCode,
): LanguageCode {
  return parseLocaleFromPathname(pathname ?? '') ?? fallback;
}

export function shouldApplyServerCategoriesSnapshot(
  initialCategories: unknown[] | undefined,
  initialLanguage: LanguageCode | undefined,
): boolean {
  return (
    Array.isArray(initialCategories) &&
    initialCategories.length > 0 &&
    initialLanguage !== undefined
  );
}

export function shouldApplyServerProductSnapshot(
  hasInitialProduct: boolean,
  initialLocale: LanguageCode | undefined,
  uiLanguage: LanguageCode,
): boolean {
  return hasInitialProduct && initialLocale !== undefined && uiLanguage === initialLocale;
}
