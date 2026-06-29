import type { LanguageCode } from '../language';
import { normalizeProductSpecsHtml } from './normalize-product-specs';

/**
 * Localizes MobileCentre-imported spec tables inside product description HTML.
 */
export function translateProductSpecsHtml(lang: LanguageCode | undefined, html: string): string {
  return normalizeProductSpecsHtml(lang, html);
}
