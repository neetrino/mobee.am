import type { LanguageCode } from '../language';
import { getProductDescriptionHtml } from './get-product-description-html';
import {
  normalizeProductSpecSections,
  normalizeProductSpecsHtml,
  parseProductSpecsTableItems,
} from './normalize-product-specs';
import { translateSpecValue } from './product-spec-value-i18n';

export interface CompareProductSpecRow {
  /** Stable row key (`labelKey` or normalized label). */
  key: string;
  label: string;
  value: string;
}

export interface CompareProductDescriptionSource {
  description?: string | null;
  sourceDescription?: string | null;
}

/**
 * Extracts normalized specification rows from product description HTML for compare tables.
 */
export function extractCompareProductSpecs(
  lang: LanguageCode,
  productId: string,
  sources: CompareProductDescriptionSource,
): CompareProductSpecRow[] {
  const html = getProductDescriptionHtml(lang, productId, sources);
  if (!html.includes('product-specs')) {
    return [];
  }

  const normalizedHtml = normalizeProductSpecsHtml(lang, html);
  const items = parseProductSpecsTableItems(normalizedHtml);
  const sections = normalizeProductSpecSections(items, lang);
  const rows: CompareProductSpecRow[] = [];
  const seenKeys = new Set<string>();

  for (const section of sections) {
    for (const row of section.rows) {
      const key = row.labelKey ?? row.label.trim().toLowerCase();
      if (!key || seenKeys.has(key)) {
        continue;
      }
      seenKeys.add(key);
      rows.push({
        key,
        label: row.label,
        value: translateSpecValue(lang, row.value),
      });
    }
  }

  return rows;
}

export function buildCompareSpecTableRows(
  products: Array<{ id: string } & CompareProductDescriptionSource>,
  lang: LanguageCode,
): Array<{
  id: string;
  label: string;
  valuesByProductId: Map<string, string>;
}> {
  const specsByProductId = new Map<string, CompareProductSpecRow[]>(
    products.map((product) => [
      product.id,
      extractCompareProductSpecs(lang, product.id, product),
    ]),
  );

  const keyOrder: string[] = [];
  const labelByKey = new Map<string, string>();

  for (const product of products) {
    const specs = specsByProductId.get(product.id) ?? [];
    for (const spec of specs) {
      if (!labelByKey.has(spec.key)) {
        keyOrder.push(spec.key);
        labelByKey.set(spec.key, spec.label);
      }
    }
  }

  return keyOrder.map((key) => {
    const valuesByProductId = new Map<string, string>();
    for (const product of products) {
      const match = specsByProductId.get(product.id)?.find((spec) => spec.key === key);
      valuesByProductId.set(product.id, match?.value ?? '-');
    }

    return {
      id: `spec-${key}`,
      label: labelByKey.get(key) ?? key,
      valuesByProductId,
    };
  });
}
