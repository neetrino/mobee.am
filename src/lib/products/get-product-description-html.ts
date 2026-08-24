import { getProductText } from '../i18n';
import type { LanguageCode } from '../language';
import { translateProductSpecsHtml } from './translate-product-specs-html';

export interface ProductDescriptionSource {
  /** Localized description from API (current locale DB translation). */
  description?: string | null;
  /** Armenian source description from DB (hy translation). */
  sourceDescription?: string | null;
}

/**
 * Resolves product description HTML with safe locale fallback:
 * 1. current locale (JSON override or API description)
 * 2. Armenian source description
 * 3. empty string
 *
 * Spec tables are normalized and label-localized at render time.
 */
export function getProductDescriptionHtml(
  lang: LanguageCode | undefined,
  productId: string,
  sources: ProductDescriptionSource | string | null | undefined = {},
): string {
  const resolvedSources: ProductDescriptionSource =
    typeof sources === 'string' || sources === null || sources === undefined
      ? { description: sources }
      : sources;

  const locale = lang ?? 'hy';
  const localizedRaw =
    getProductText(locale, productId, 'longDescription') ||
    resolvedSources.description ||
    '';

  if (localizedRaw.trim()) {
    return translateProductSpecsHtml(locale, localizedRaw);
  }

  if (locale !== 'hy') {
    const armenianRaw =
      getProductText('hy', productId, 'longDescription') ||
      resolvedSources.sourceDescription ||
      '';
    if (armenianRaw.trim()) {
      return translateProductSpecsHtml(locale, armenianRaw);
    }
  }

  return '';
}
