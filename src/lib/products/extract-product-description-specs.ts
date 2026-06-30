import type { LanguageCode } from '../language';
import { getProductDescriptionHtml, type ProductDescriptionSource } from './get-product-description-html';
import {
  normalizeProductSpecSections,
  normalizeProductSpecsHtml,
  parseProductSpecsTableItems,
} from './normalize-product-specs';
import { translateSpecValue } from './product-spec-value-i18n';

export interface ProductDescriptionSpecRow {
  label: string;
  value: string;
  labelKey?: string;
}

export interface ProductDescriptionSpecSection {
  slug: string;
  rows: ProductDescriptionSpecRow[];
}

export interface ProductDescriptionSpecsResult {
  sections: ProductDescriptionSpecSection[];
  prefixHtml: string;
  suffixHtml: string;
  hasSpecs: boolean;
}

function splitSpecsTable(html: string): { prefixHtml: string; suffixHtml: string } {
  const match = html.match(/<table class="product-specs">[\s\S]*?<\/table>/);
  if (!match || match.index === undefined) {
    return { prefixHtml: html, suffixHtml: '' };
  }

  return {
    prefixHtml: html.slice(0, match.index).trim(),
    suffixHtml: html.slice(match.index + match[0].length).trim(),
  };
}

/**
 * Parses normalized product specification sections from description HTML.
 */
export function extractProductDescriptionSpecs(
  lang: LanguageCode,
  productId: string,
  sources: ProductDescriptionSource,
): ProductDescriptionSpecsResult {
  const html = getProductDescriptionHtml(lang, productId, sources);
  if (!html.includes('product-specs')) {
    return { sections: [], prefixHtml: html, suffixHtml: '', hasSpecs: false };
  }

  const normalizedHtml = normalizeProductSpecsHtml(lang, html);
  const items = parseProductSpecsTableItems(normalizedHtml);
  const sections = normalizeProductSpecSections(items, lang).map((section) => ({
    slug: section.slug,
    rows: section.rows.map((row) => ({
      label: row.label,
      value: translateSpecValue(lang, row.value),
      labelKey: row.labelKey,
    })),
  }));
  const { prefixHtml, suffixHtml } = splitSpecsTable(normalizedHtml);

  return {
    sections,
    prefixHtml,
    suffixHtml,
    hasSpecs: sections.some((section) => section.rows.length > 0),
  };
}
