import type { LanguageCode } from '../language';
import { t } from '../i18n';
import { isSectionTitleAsSpecLabel, looksLikeSpecValue, resolveSpecLabelKey } from './product-spec-heuristics';
import { PRODUCT_SPEC_SECTION_HEADER_TITLES } from './product-spec-label-keys';
import {
  classifySpecValue,
  isCompatibleSpecPair,
  recoverLabelKeyForValue,
  resolveGenericLabelKeyByValue,
} from './product-spec-semantic';
import {
  findArmenianSpecLabelsInHtml,
  shouldRejectArmenianSpecLabels,
} from './product-spec-audit-locale';

import {
  normalizeProductSpecSections,
  normalizeProductSpecsHtml,
  parseProductSpecsTableItems,
  type NormalizedSpecRow,
  type NormalizedSpecSection,
} from './normalize-product-specs';

export type SpecAuditIssueType =
  | 'invalid_pair'
  | 'suspicious_generic'
  | 'section_as_row'
  | 'duplicate_group'
  | 'duplicate_row'
  | 'empty_group'
  | 'label_key_conflict'
  | 'untranslated_armenian_label';

export interface SpecAuditIssue {
  type: SpecAuditIssueType;
  locale: LanguageCode;
  rawLabel: string;
  rawValue: string;
  normalizedLabel: string;
  normalizedValue: string;
  labelKey?: string;
  reason: string;
  suggestedFix?: string;
}

export interface ProductSpecAuditResult {
  productId: string;
  slug: string;
  title: string;
  locale: LanguageCode;
  hasSpecsTable: boolean;
  rawRowCount: number;
  normalizedRowCount: number;
  issues: SpecAuditIssue[];
}

export interface SpecAuditSummary {
  totalProductsScanned: number;
  productsWithDescriptions: number;
  productsWithSpecsTable: number;
  productsWithZeroIssues: number;
  productsWithIssues: number;
  invalidSemanticPairs: number;
  suspiciousGenericLabels: number;
  sectionHeaderAsRow: number;
  duplicateGroups: number;
  duplicateRows: number;
  emptyGroups: number;
  labelKeyConflicts: number;
  untranslatedArmenianLabels: number;
}

export interface SpecAuditLocaleSummary extends SpecAuditSummary {
  locale: LanguageCode;
}

export interface SpecAuditOptions {
  includeRaw?: boolean;
  auditFinalHtml?: boolean;
}

export const ALL_AUDIT_LOCALES: readonly LanguageCode[] = ['hy', 'en', 'ru'];

const DEFAULT_AUDIT_LOCALES: readonly LanguageCode[] = ALL_AUDIT_LOCALES;

const SUSPICIOUS_GENERIC_LABELS = new Set<string>([
  ...PRODUCT_SPEC_SECTION_HEADER_TITLES,
  'Storage',
  'Memory',
  'Type',
  'Other',
  'General',
  'Screen',
  'Память',
  'Тип',
  'Другое',
  'Встроенная память',
]);

function translateLabel(lang: LanguageCode, labelKey: string): string {
  const translated = t(lang, labelKey);
  return translated === labelKey ? labelKey : translated;
}

function buildRawContext(raw: { label: string; value: string } | null): { rawLabel: string } {
  if (!raw) {
    return { rawLabel: '' };
  }

  const labelKeyFromLabel = resolveSpecLabelKey(raw.label);
  const labelKeyFromValue = resolveSpecLabelKey(raw.value);

  if (labelKeyFromValue && looksLikeSpecValue(raw.label)) {
    return { rawLabel: raw.value };
  }

  if (labelKeyFromLabel && looksLikeSpecValue(raw.value)) {
    return { rawLabel: raw.label };
  }

  return { rawLabel: raw.label };
}

function findRawRow(
  rawRows: Array<{ label: string; value: string }>,
  normalizedLabel: string,
  normalizedValue: string,
): { label: string; value: string } | null {
  const exact = rawRows.find(
    (row) => row.label === normalizedLabel && row.value === normalizedValue,
  );
  if (exact) {
    return exact;
  }

  const swapped = rawRows.find(
    (row) => row.label === normalizedValue && row.value === normalizedLabel,
  );
  if (swapped) {
    return swapped;
  }

  const valueMatch = rawRows.find((row) => row.value === normalizedValue || row.label === normalizedValue);
  if (valueMatch) {
    return valueMatch;
  }

  return null;
}

function suggestLabel(lang: LanguageCode, labelKey: string): string {
  return translateLabel(lang, labelKey);
}

function buildSuggestedFix(
  lang: LanguageCode,
  labelKey: string | undefined,
  value: string,
): string | undefined {
  if (!labelKey) {
    return undefined;
  }
  return `${suggestLabel(lang, labelKey)} | ${value}`;
}

function resolveBetterLabelKey(
  row: NormalizedSpecRow,
  raw: { label: string; value: string } | null,
): string | undefined {
  const context = buildRawContext(raw);
  const rawLabel = context.rawLabel;
  const recovered = recoverLabelKeyForValue(row.value, context);
  if (recovered && recovered !== row.labelKey) {
    return recovered;
  }

  const generic = resolveGenericLabelKeyByValue(rawLabel, row.value, context);
  if (generic && generic !== row.labelKey) {
    return generic;
  }

  return undefined;
}

function detectDuplicateGroups(sections: NormalizedSpecSection[]): number {
  const slugs = sections.map((section) => section.slug);
  const seen = new Set<string>();
  let duplicates = 0;

  for (const slug of slugs) {
    if (seen.has(slug)) {
      duplicates += 1;
    }
    seen.add(slug);
  }

  return duplicates;
}

function detectEmptyGroupsInRaw(items: ReturnType<typeof parseProductSpecsTableItems>): number {
  let emptyGroups = 0;

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item.type !== 'section') {
      continue;
    }

    const next = items[index + 1];
    if (!next || next.type === 'section') {
      emptyGroups += 1;
    }
  }

  return emptyGroups;
}

function detectEmptyGroupsInFinalHtml(html: string): number {
  const items = parseProductSpecsTableItems(html);
  return detectEmptyGroupsInRaw(items);
}

function auditNormalizedRows(
  locale: LanguageCode,
  rawRows: Array<{ label: string; value: string }>,
  sections: NormalizedSpecSection[],
): SpecAuditIssue[] {
  const issues: SpecAuditIssue[] = [];
  const normalizedRows = sections.flatMap((section) => section.rows);
  const seenRows = new Map<string, NormalizedSpecRow>();

  for (const row of normalizedRows) {
    const raw = findRawRow(rawRows, row.label, row.value);
    const rawLabel = raw?.label ?? '';
    const rawValue = raw?.value ?? row.value;
    const context = buildRawContext(raw);

    if (row.labelKey && !isCompatibleSpecPair(row.labelKey, row.value, context)) {
      const betterKey =
        recoverLabelKeyForValue(row.value, context) ??
        resolveGenericLabelKeyByValue(rawLabel, row.value, context);
      issues.push({
        type: 'invalid_pair',
        locale,
        rawLabel,
        rawValue,
        normalizedLabel: row.label,
        normalizedValue: row.value,
        labelKey: row.labelKey,
        reason: `${classifySpecValue(row.value, context)} value incompatible with ${row.labelKey}`,
        suggestedFix: buildSuggestedFix(locale, betterKey, row.value),
      });
    }

    if (isSectionTitleAsSpecLabel(row.label, row.labelKey, row.value)) {
      issues.push({
        type: 'section_as_row',
        locale,
        rawLabel,
        rawValue,
        normalizedLabel: row.label,
        normalizedValue: row.value,
        labelKey: row.labelKey,
        reason: 'Section header rendered as spec label',
        suggestedFix: buildSuggestedFix(
          locale,
          recoverLabelKeyForValue(row.value, context),
          row.value,
        ),
      });
    }

    const betterKey = resolveBetterLabelKey(row, raw);
    if (
      betterKey &&
      row.labelKey !== betterKey &&
      (SUSPICIOUS_GENERIC_LABELS.has(row.label) || SUSPICIOUS_GENERIC_LABELS.has(rawLabel))
    ) {
      issues.push({
        type: 'suspicious_generic',
        locale,
        rawLabel,
        rawValue,
        normalizedLabel: row.label,
        normalizedValue: row.value,
        labelKey: row.labelKey,
        reason: 'Generic label could be replaced with a more specific canonical label',
        suggestedFix: buildSuggestedFix(locale, betterKey, row.value),
      });
    }

    if (row.labelKey) {
      const recovered = recoverLabelKeyForValue(row.value, context);
      if (
        recovered &&
        recovered !== row.labelKey &&
        isCompatibleSpecPair(recovered, row.value, context) &&
        !isCompatibleSpecPair(row.labelKey, row.value, context)
      ) {
        issues.push({
          type: 'label_key_conflict',
          locale,
          rawLabel,
          rawValue,
          normalizedLabel: row.label,
          normalizedValue: row.value,
          labelKey: row.labelKey,
          reason: `Value maps to ${recovered} but row uses ${row.labelKey}`,
          suggestedFix: buildSuggestedFix(locale, recovered, row.value),
        });
      }
    }

    const dedupeKey = `${row.labelKey ?? row.label.toLowerCase()}::${row.value.toLowerCase()}`;
    if (seenRows.has(dedupeKey)) {
      issues.push({
        type: 'duplicate_row',
        locale,
        rawLabel,
        rawValue,
        normalizedLabel: row.label,
        normalizedValue: row.value,
        labelKey: row.labelKey,
        reason: 'Duplicate normalized row',
      });
      continue;
    }
    seenRows.set(dedupeKey, row);
  }

  return issues;
}

/**
 * Audits one product description HTML using the same normalization pipeline as PDP.
 */
export function auditProductDescriptionHtml(
  productId: string,
  slug: string,
  title: string,
  descriptionHtml: string,
  locale: LanguageCode = 'hy',
  options: SpecAuditOptions = {},
): ProductSpecAuditResult {
  const hasSpecsTable = descriptionHtml.includes('product-specs');
  const rawItems = parseProductSpecsTableItems(descriptionHtml);
  const rawRows = rawItems
    .filter((item): item is { type: 'row'; label: string; value: string } => item.type === 'row')
    .map((row) => ({ label: row.label, value: row.value }));

  if (!hasSpecsTable) {
    return {
      productId,
      slug,
      title,
      locale,
      hasSpecsTable: false,
      rawRowCount: 0,
      normalizedRowCount: 0,
      issues: [],
    };
  }

  const sections = normalizeProductSpecSections(rawItems, locale);
  const normalizedRows = sections.flatMap((section) => section.rows);
  const issues = auditNormalizedRows(locale, rawRows, sections);

  const finalHtml = normalizeProductSpecsHtml(locale, descriptionHtml);
  const auditFinalHtml = options.auditFinalHtml !== false;

  if (auditFinalHtml) {
    const emptyGroupsFinal = detectEmptyGroupsInFinalHtml(finalHtml);
    if (emptyGroupsFinal > 0) {
      issues.push({
        type: 'empty_group',
        locale,
        rawLabel: '',
        rawValue: '',
        normalizedLabel: '',
        normalizedValue: '',
        reason: `${emptyGroupsFinal} empty group(s) in final normalized HTML`,
      });
    }

    if (shouldRejectArmenianSpecLabels(locale)) {
      const armenianLabels = findArmenianSpecLabelsInHtml(finalHtml);
      for (const armenianLabel of armenianLabels) {
        issues.push({
          type: 'untranslated_armenian_label',
          locale,
          rawLabel: armenianLabel,
          rawValue: '',
          normalizedLabel: armenianLabel,
          normalizedValue: '',
          reason: 'Armenian spec label in non-Armenian localized output',
        });
      }
    }
  }

  if (options.includeRaw) {
    const emptyGroupsRaw = detectEmptyGroupsInRaw(rawItems);
    if (emptyGroupsRaw > 0) {
      issues.push({
        type: 'empty_group',
        locale,
        rawLabel: '',
        rawValue: '',
        normalizedLabel: '',
        normalizedValue: '',
        reason: `${emptyGroupsRaw} empty group(s) in raw HTML (fixed at runtime)`,
      });
    }
  }

  const duplicateGroups = detectDuplicateGroups(sections);
  if (duplicateGroups > 0) {
    issues.push({
      type: 'duplicate_group',
      locale,
      rawLabel: '',
      rawValue: '',
      normalizedLabel: '',
      normalizedValue: '',
      reason: `${duplicateGroups} duplicate group header(s) after normalization`,
    });
  }

  return {
    productId,
    slug,
    title,
    locale,
    hasSpecsTable: true,
    rawRowCount: rawRows.length,
    normalizedRowCount: normalizedRows.length,
    issues,
  };
}

export function auditProductDescriptionHtmlAllLocales(
  productId: string,
  slug: string,
  title: string,
  descriptionHtml: string,
  options: SpecAuditOptions = {},
  locales: readonly LanguageCode[] = DEFAULT_AUDIT_LOCALES,
): ProductSpecAuditResult[] {
  return locales.map((locale) =>
    auditProductDescriptionHtml(productId, slug, title, descriptionHtml, locale, options),
  );
}

export function summarizeSpecAudit(results: ProductSpecAuditResult[]): SpecAuditSummary {
  const productIds = new Set(results.map((result) => result.productId));
  const productsWithSpecsTableIds = new Set(
    results.filter((result) => result.hasSpecsTable).map((result) => result.productId),
  );
  const issueProductIds = new Set(
    results.filter((result) => result.issues.length > 0).map((result) => result.productId),
  );

  const countByType = (type: SpecAuditIssueType): number =>
    results.reduce(
      (total, result) => total + result.issues.filter((issue) => issue.type === type).length,
      0,
    );

  return {
    totalProductsScanned: productIds.size,
    productsWithDescriptions: productIds.size,
    productsWithSpecsTable: productsWithSpecsTableIds.size,
    productsWithZeroIssues: productsWithSpecsTableIds.size - issueProductIds.size,
    productsWithIssues: issueProductIds.size,
    invalidSemanticPairs: countByType('invalid_pair'),
    suspiciousGenericLabels: countByType('suspicious_generic'),
    sectionHeaderAsRow: countByType('section_as_row'),
    duplicateGroups: countByType('duplicate_group'),
    duplicateRows: countByType('duplicate_row'),
    emptyGroups: countByType('empty_group'),
    labelKeyConflicts: countByType('label_key_conflict'),
    untranslatedArmenianLabels: countByType('untranslated_armenian_label'),
  };
}

export function summarizeSpecAuditByLocale(
  results: ProductSpecAuditResult[],
): SpecAuditLocaleSummary[] {
  const locales = [...new Set(results.map((result) => result.locale))];
  return locales.map((locale) => {
    const localeResults = results.filter((result) => result.locale === locale);
    return {
      locale,
      ...summarizeSpecAudit(localeResults),
    };
  });
}

function formatRow(label: string, value: string): string {
  if (!label && !value) {
    return '—';
  }
  return `${label} | ${value}`;
}

export function renderSpecAuditMarkdown(
  results: ProductSpecAuditResult[],
  summary: SpecAuditSummary,
  baseUrl: string,
): string {
  const lines: string[] = [
    '# Product specification normalization audit',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- Total products scanned: ${summary.totalProductsScanned}`,
    `- Products with descriptions: ${summary.productsWithDescriptions}`,
    `- Products with spec tables: ${summary.productsWithSpecsTable}`,
    `- Products with zero issues: ${summary.productsWithZeroIssues}`,
    `- Products with issues: ${summary.productsWithIssues}`,
    `- Invalid semantic pairs: ${summary.invalidSemanticPairs}`,
    `- Suspicious generic labels: ${summary.suspiciousGenericLabels}`,
    `- Section header as row: ${summary.sectionHeaderAsRow}`,
    `- Duplicate groups: ${summary.duplicateGroups}`,
    `- Duplicate rows: ${summary.duplicateRows}`,
    `- Empty groups: ${summary.emptyGroups}`,
    `- Label key conflicts: ${summary.labelKeyConflicts}`,
    `- Untranslated Armenian labels: ${summary.untranslatedArmenianLabels}`,
    '',
  ];

  const grouped = new Map<string, ProductSpecAuditResult[]>();
  for (const result of results) {
    if (result.issues.length === 0) {
      continue;
    }
    const bucket = grouped.get(result.productId) ?? [];
    bucket.push(result);
    grouped.set(result.productId, bucket);
  }

  if (grouped.size === 0) {
    lines.push('## Problematic products', '', 'No issues found.', '');
    return `${lines.join('\n')}\n`;
  }

  lines.push('## Problematic products', '');

  for (const [productId, productResults] of grouped.entries()) {
    const primary = productResults[0];
    const issueCount = productResults.reduce((total, result) => total + result.issues.length, 0);
    lines.push(`### ${primary.title}`);
    lines.push('');
    lines.push(`- Product ID: ${productId}`);
    lines.push(`- Slug: ${primary.slug}`);
    lines.push(`- Product URL: ${baseUrl}/products/${primary.slug}`);
    lines.push(`- Issue count: ${issueCount}`);
    lines.push('');
    lines.push('| Type | Raw row | Normalized row | Reason | Suggested fix |');
    lines.push('| ---- | ------- | -------------- | ------ | ------------- |');

    for (const result of productResults) {
      for (const issue of result.issues) {
        lines.push(
          `| ${issue.type} (${issue.locale}) | ${formatRow(issue.rawLabel, issue.rawValue)} | ${formatRow(issue.normalizedLabel, issue.normalizedValue)} | ${issue.reason} | ${issue.suggestedFix ?? '—'} |`,
        );
      }
    }

    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

export function hasStrictAuditFailures(summary: SpecAuditSummary): boolean {
  return (
    summary.invalidSemanticPairs > 0 ||
    summary.sectionHeaderAsRow > 0 ||
    summary.labelKeyConflicts > 0 ||
    summary.untranslatedArmenianLabels > 0
  );
}

export function hasStrictFinalAuditFailures(summary: SpecAuditSummary): boolean {
  return hasStrictAuditFailures(summary) || summary.emptyGroups > 0;
}
