import type { LanguageCode } from '../language';
import {
  auditProductDescriptionHtml,
  summarizeSpecAudit,
  type ProductSpecAuditResult,
  type SpecAuditSummary,
} from './audit-product-spec-normalization';
import { findArmenianSpecLabelsInHtml, shouldRejectArmenianSpecLabels } from './product-spec-audit-locale';
import { getProductDescriptionHtml } from './get-product-description-html';
import { normalizeProductSpecsHtml } from './normalize-product-specs';

export interface ProductTranslationRecord {
  productId: string;
  slug: string;
  title: string;
  translations: Partial<Record<LanguageCode, string | null>>;
}

export interface ProductDescriptionTranslationAuditRow {
  productId: string;
  slug: string;
  title: string;
  hasArmenianDescription: boolean;
  hasEnglishDescription: boolean;
  hasRussianDescription: boolean;
  missingEnglishDescription: boolean;
  missingRussianDescription: boolean;
  specLabelsOkHy: boolean;
  specLabelsOkEn: boolean;
  specLabelsOkRu: boolean;
  armenianLabelsInEnglishOutput: number;
  armenianLabelsInRussianOutput: number;
  issues: string[];
}

export interface DescriptionTranslationAuditSummary {
  productsScanned: number;
  missingEnglishDescriptions: number;
  missingRussianDescriptions: number;
  armenianLabelsInEnglishOutput: number;
  armenianLabelsInRussianOutput: number;
  specAuditByLocale: Partial<Record<LanguageCode, SpecAuditSummary>>;
}

function hasDescription(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function resolveDescription(
  translations: Partial<Record<LanguageCode, string | null>>,
  locale: LanguageCode,
): string {
  return translations[locale]?.trim() ?? '';
}

function auditLocalizedOutput(
  product: ProductTranslationRecord,
  locale: LanguageCode,
  sourceHtml: string,
): { specResult: ProductSpecAuditResult; armenianLabelCount: number; issues: string[] } {
  const rendered = getProductDescriptionHtml(locale, product.productId, {
    description: locale === 'hy' ? sourceHtml : resolveDescription(product.translations, locale),
    sourceDescription: resolveDescription(product.translations, 'hy'),
  });

  const specResult = auditProductDescriptionHtml(
    product.productId,
    product.slug,
    product.title,
    rendered,
    locale,
    { auditFinalHtml: true },
  );

  const armenianLabelCount = shouldRejectArmenianSpecLabels(locale)
    ? findArmenianSpecLabelsInHtml(rendered).length
    : 0;

  const issues = specResult.issues.map((issue) => `[${locale}] ${issue.type}: ${issue.reason}`);

  return { specResult, armenianLabelCount, issues };
}

export function auditProductDescriptionTranslations(
  products: ProductTranslationRecord[],
): ProductDescriptionTranslationAuditRow[] {
  return products.map((product) => {
    const hyHtml = resolveDescription(product.translations, 'hy');
    const enHtml = resolveDescription(product.translations, 'en');
    const ruHtml = resolveDescription(product.translations, 'ru');
    const sourceHtml = hyHtml || enHtml || ruHtml;

    const hyAudit = auditLocalizedOutput(product, 'hy', sourceHtml);
    const enAudit = auditLocalizedOutput(product, 'en', sourceHtml);
    const ruAudit = auditLocalizedOutput(product, 'ru', sourceHtml);

    const rowIssues: string[] = [
      ...hyAudit.issues,
      ...enAudit.issues,
      ...ruAudit.issues,
    ];

    if (!hasDescription(enHtml) && hasDescription(hyHtml)) {
      rowIssues.push('[en] missing_description: English description missing (Armenian fallback used at runtime)');
    }
    if (!hasDescription(ruHtml) && hasDescription(hyHtml)) {
      rowIssues.push('[ru] missing_description: Russian description missing (Armenian fallback used at runtime)');
    }

    return {
      productId: product.productId,
      slug: product.slug,
      title: product.title,
      hasArmenianDescription: hasDescription(hyHtml),
      hasEnglishDescription: hasDescription(enHtml),
      hasRussianDescription: hasDescription(ruHtml),
      missingEnglishDescription: hasDescription(hyHtml) && !hasDescription(enHtml),
      missingRussianDescription: hasDescription(hyHtml) && !hasDescription(ruHtml),
      specLabelsOkHy: hyAudit.specResult.issues.length === 0,
      specLabelsOkEn: enAudit.specResult.issues.length === 0,
      specLabelsOkRu: ruAudit.specResult.issues.length === 0,
      armenianLabelsInEnglishOutput: enAudit.armenianLabelCount,
      armenianLabelsInRussianOutput: ruAudit.armenianLabelCount,
      issues: rowIssues,
    };
  });
}

export function summarizeDescriptionTranslationAudit(
  rows: ProductDescriptionTranslationAuditRow[],
  specResults: ProductSpecAuditResult[],
): DescriptionTranslationAuditSummary {
  const specAuditByLocale: Partial<Record<LanguageCode, SpecAuditSummary>> = {};
  for (const locale of ['hy', 'en', 'ru'] as const) {
    const localeResults = specResults.filter((result) => result.locale === locale);
    if (localeResults.length > 0) {
      specAuditByLocale[locale] = summarizeSpecAudit(localeResults);
    }
  }

  return {
    productsScanned: rows.length,
    missingEnglishDescriptions: rows.filter((row) => row.missingEnglishDescription).length,
    missingRussianDescriptions: rows.filter((row) => row.missingRussianDescription).length,
    armenianLabelsInEnglishOutput: rows.reduce(
      (total, row) => total + row.armenianLabelsInEnglishOutput,
      0,
    ),
    armenianLabelsInRussianOutput: rows.reduce(
      (total, row) => total + row.armenianLabelsInRussianOutput,
      0,
    ),
    specAuditByLocale,
  };
}

export function renderDescriptionTranslationAuditMarkdown(
  rows: ProductDescriptionTranslationAuditRow[],
  summary: DescriptionTranslationAuditSummary,
  baseUrl: string,
): string {
  const lines: string[] = [
    '# Product description translation audit',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- Products scanned: ${summary.productsScanned}`,
    `- Missing English descriptions: ${summary.missingEnglishDescriptions}`,
    `- Missing Russian descriptions: ${summary.missingRussianDescriptions}`,
    `- Armenian labels in English output: ${summary.armenianLabelsInEnglishOutput}`,
    `- Armenian labels in Russian output: ${summary.armenianLabelsInRussianOutput}`,
    '',
    '## Spec normalization by locale',
    '',
    '| Metric | HY | EN | RU |',
    '| ------ | -- | -- | -- |',
  ];

  const metric = (locale: LanguageCode, pick: (summary: SpecAuditSummary) => number): string => {
    const value = summary.specAuditByLocale[locale];
    return value ? String(pick(value)) : '—';
  };

  lines.push(
    `| products scanned | ${metric('hy', (s) => s.totalProductsScanned)} | ${metric('en', (s) => s.totalProductsScanned)} | ${metric('ru', (s) => s.totalProductsScanned)} |`,
  );
  lines.push(
    `| missing descriptions | — | ${summary.missingEnglishDescriptions} | ${summary.missingRussianDescriptions} |`,
  );
  lines.push(
    `| invalid semantic pairs | ${metric('hy', (s) => s.invalidSemanticPairs)} | ${metric('en', (s) => s.invalidSemanticPairs)} | ${metric('ru', (s) => s.invalidSemanticPairs)} |`,
  );
  lines.push(
    `| section_as_row | ${metric('hy', (s) => s.sectionHeaderAsRow)} | ${metric('en', (s) => s.sectionHeaderAsRow)} | ${metric('ru', (s) => s.sectionHeaderAsRow)} |`,
  );
  lines.push(
    `| label_key_conflict | ${metric('hy', (s) => s.labelKeyConflicts)} | ${metric('en', (s) => s.labelKeyConflicts)} | ${metric('ru', (s) => s.labelKeyConflicts)} |`,
  );
  lines.push(
    `| empty_group | ${metric('hy', (s) => s.emptyGroups)} | ${metric('en', (s) => s.emptyGroups)} | ${metric('ru', (s) => s.emptyGroups)} |`,
  );
  lines.push(
    `| untranslated Armenian labels | ${metric('hy', (s) => s.untranslatedArmenianLabels)} | ${metric('en', (s) => s.untranslatedArmenianLabels)} | ${metric('ru', (s) => s.untranslatedArmenianLabels)} |`,
  );
  lines.push('');

  const problematic = rows.filter((row) => row.issues.length > 0);
  if (problematic.length === 0) {
    lines.push('## Products with issues', '', 'No issues found.', '');
    return `${lines.join('\n')}\n`;
  }

  lines.push('## Products with issues', '');
  for (const row of problematic.slice(0, 200)) {
    lines.push(`### ${row.title}`);
    lines.push('');
    lines.push(`- Product ID: ${row.productId}`);
    lines.push(`- Slug: ${row.slug}`);
    lines.push(`- URL: ${baseUrl}/products/${row.slug}`);
    lines.push(`- HY description: ${row.hasArmenianDescription ? 'yes' : 'no'}`);
    lines.push(`- EN description: ${row.hasEnglishDescription ? 'yes' : 'no'}`);
    lines.push(`- RU description: ${row.hasRussianDescription ? 'yes' : 'no'}`);
    lines.push(`- Armenian labels in EN output: ${row.armenianLabelsInEnglishOutput}`);
    lines.push(`- Armenian labels in RU output: ${row.armenianLabelsInRussianOutput}`);
    lines.push('');
    for (const issue of row.issues.slice(0, 20)) {
      lines.push(`- ${issue}`);
    }
    lines.push('');
  }

  if (problematic.length > 200) {
    lines.push(`_…and ${problematic.length - 200} more products with issues._`, '');
  }

  return `${lines.join('\n')}\n`;
}

/** Preview localized HTML for generation (spec labels localized, values preserved). */
export function buildLocalizedDescriptionPreview(
  armenianHtml: string,
  locale: LanguageCode,
): string {
  return normalizeProductSpecsHtml(locale, armenianHtml);
}

export function hasDescriptionTranslationAuditFailures(
  summary: DescriptionTranslationAuditSummary,
): boolean {
  const enSpec = summary.specAuditByLocale.en;
  const ruSpec = summary.specAuditByLocale.ru;

  return (
    (enSpec?.untranslatedArmenianLabels ?? 0) > 0 ||
    (ruSpec?.untranslatedArmenianLabels ?? 0) > 0 ||
    (enSpec?.invalidSemanticPairs ?? 0) > 0 ||
    (ruSpec?.invalidSemanticPairs ?? 0) > 0 ||
    (enSpec?.sectionHeaderAsRow ?? 0) > 0 ||
    (ruSpec?.sectionHeaderAsRow ?? 0) > 0 ||
    (enSpec?.labelKeyConflicts ?? 0) > 0 ||
    (ruSpec?.labelKeyConflicts ?? 0) > 0 ||
    (enSpec?.emptyGroups ?? 0) > 0 ||
    (ruSpec?.emptyGroups ?? 0) > 0
  );
}
