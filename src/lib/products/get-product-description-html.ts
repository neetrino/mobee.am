import { getProductText } from '../i18n';
import type { LanguageCode } from '../language';
import { translateProductSpecsHtml } from './translate-product-specs-html';

export function getProductDescriptionHtml(
  lang: LanguageCode | undefined,
  productId: string,
  fallbackDescription?: string | null,
): string {
  const raw = getProductText(lang, productId, 'longDescription') || fallbackDescription || '';
  return translateProductSpecsHtml(lang, raw);
}
