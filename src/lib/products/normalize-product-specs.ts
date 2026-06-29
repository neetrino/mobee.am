import type { LanguageCode } from '../language';
import { t } from '../i18n';
import {
  PRODUCT_SPEC_ARMENIAN_LABEL_MAP,
  PRODUCT_SPEC_GENERIC_LABEL_MAP,
  PRODUCT_SPEC_LABEL_SECTION_SLUG,
  PRODUCT_SPEC_SECTION_ORDER,
  PRODUCT_SPEC_STATUS_ONLY_ARMENIAN,
} from './product-spec-label-keys';
import {
  isSectionOnlyLabel,
  looksLikeSpecValue,
  resolveSpecLabelKey,
  shouldSwapSpecRow,
} from './product-spec-heuristics';
import {
  isCompatibleSpecPair,
  recoverLabelKeyForValue,
  resolveGenericLabelKeyByValue,
} from './product-spec-semantic';
import { translateSpecValue } from './product-spec-value-i18n';

export interface NormalizedSpecRow {
  label: string;
  value: string;
  labelKey?: string;
  group?: string;
  order?: number;
}

export interface NormalizedSpecSection {
  slug: string;
  rows: NormalizedSpecRow[];
}

type ParsedItem =
  | { type: 'section'; slug: string }
  | { type: 'row'; label: string; value: string };

const SECTION_SLUG_TO_I18N_KEY: Record<string, string> = {
  general: 'product.specs.sections.general',
  screen: 'product.specs.sections.screen',
  cameras: 'product.specs.sections.cameras',
  memory: 'product.specs.sections.memory',
  processor: 'product.specs.sections.processor',
  connectivity: 'product.specs.sections.connectivity',
  network: 'product.specs.sections.connectivity',
  power: 'product.specs.sections.power',
  physical: 'product.specs.sections.physical',
  warranty: 'product.specs.sections.warranty',
  other: 'product.specs.sections.other',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function translateSpecLabel(lang: LanguageCode | undefined, i18nKey: string): string {
  const translated = t(lang, i18nKey);
  return translated === i18nKey ? '' : translated;
}

function buildSpecRowHtml(label: string, value: string, lang: LanguageCode | undefined): string {
  const localizedValue = translateSpecValue(lang, value);
  return `<tr class="spec-row"><td class="spec-label">${escapeHtml(label)}</td><td class="spec-value">${escapeHtml(localizedValue)}</td></tr>`;
}

function buildSectionRowHtml(slug: string, title: string): string {
  return `<tr class="specs-section specs-section--${slug}"><td colspan="2"><span class="specs-section-icon" aria-hidden="true"></span><span class="specs-section-title">${escapeHtml(title)}</span></td></tr>`;
}

function parseTableItems(tbodyHtml: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/g;
  let match: RegExpExecArray | null;

  while ((match = rowRegex.exec(tbodyHtml)) !== null) {
    const rowHtml = match[0];
    if (rowHtml.includes('specs-section')) {
      const slugMatch = rowHtml.match(/specs-section--(\w+)/);
      items.push({ type: 'section', slug: slugMatch?.[1] ?? 'other' });
      continue;
    }

    if (!rowHtml.includes('spec-row')) {
      continue;
    }

    const labelMatch = rowHtml.match(/spec-label">([^<]*)/);
    const valueMatch = rowHtml.match(/spec-value">([^<]*)/);
    items.push({
      type: 'row',
      label: decodeHtmlEntities(labelMatch?.[1] ?? '').trim(),
      value: decodeHtmlEntities(valueMatch?.[1] ?? '').trim(),
    });
  }

  return items;
}

function resolveRowLabelKey(label: string, value: string): string | undefined {
  const trimmed = label.trim();
  if (isSectionOnlyLabel(trimmed)) {
    return undefined;
  }

  const context = { rawLabel: trimmed };
  const armenianKey = PRODUCT_SPEC_ARMENIAN_LABEL_MAP.get(trimmed);
  if (armenianKey && isCompatibleSpecPair(armenianKey, value, context)) {
    return armenianKey;
  }

  const valueAwareKey = resolveGenericLabelKeyByValue(trimmed, value, context);
  if (valueAwareKey) {
    return valueAwareKey;
  }

  const genericKey = PRODUCT_SPEC_GENERIC_LABEL_MAP.get(trimmed);
  if (genericKey && isCompatibleSpecPair(genericKey, value, context)) {
    return genericKey;
  }

  if (armenianKey) {
    return armenianKey;
  }

  return genericKey;
}

const ARMENIAN_LETTER = /[\u0531-\u0587]/;

function localizeUnresolvedArmenianRow(
  label: string,
  value: string,
  lang: LanguageCode | undefined,
): NormalizedSpecRow | null {
  if (!lang || lang === 'hy' || !ARMENIAN_LETTER.test(label)) {
    return null;
  }

  const isProseLabel = label.length >= 28 || /[.:;]/.test(label);
  if (!isProseLabel) {
    return null;
  }

  const otherLabel = translateSpecLabel(lang, 'product.specs.labels.other');
  if (!otherLabel) {
    return null;
  }

  const combinedValue =
    value && value !== label && !ARMENIAN_LETTER.test(value) ? `${label} — ${value}` : label;

  return {
    label: otherLabel,
    value: combinedValue,
    labelKey: 'product.specs.labels.other',
  };
}

function applySemanticRecovery(
  labelKey: string | undefined,
  label: string,
  value: string,
  lang: LanguageCode | undefined,
): NormalizedSpecRow | null {
  if (!value) {
    return null;
  }

  const context = { rawLabel: label };
  let resolvedKey = labelKey;

  if (resolvedKey && !isCompatibleSpecPair(resolvedKey, value, context)) {
    resolvedKey =
      recoverLabelKeyForValue(value, context) ??
      resolveGenericLabelKeyByValue(label, value, context) ??
      undefined;
  }

  if (!resolvedKey) {
    resolvedKey = recoverLabelKeyForValue(value, context);
  }

  if (!resolvedKey) {
    resolvedKey = resolveGenericLabelKeyByValue(label, value, context);
  }

  if (!resolvedKey) {
    if (!label || isSectionOnlyLabel(label)) {
      return null;
    }
    return localizeUnresolvedArmenianRow(label, value, lang) ?? { label, value };
  }

  const translatedLabel = translateSpecLabel(lang, resolvedKey);
  if (!translatedLabel) {
    return { label, value, labelKey: resolvedKey };
  }

  return { label: translatedLabel, value, labelKey: resolvedKey };
}

function normalizeRowPair(label: string, value: string, lang: LanguageCode | undefined): NormalizedSpecRow | null {
  let resolvedLabel = label;
  let resolvedValue = value;

  const rawLabelKey = resolveRowLabelKey(resolvedLabel, resolvedValue);
  const rawValueKey = resolveSpecLabelKey(resolvedValue);

  if (rawLabelKey === 'product.specs.labels.availableInStores') {
    return null;
  }

  if (rawLabelKey && rawValueKey) {
    return null;
  }

  if (isSectionOnlyLabel(resolvedLabel)) {
    return applySemanticRecovery(undefined, resolvedLabel, resolvedValue, lang);
  }

  // MobileCentre import sometimes puts warranty months beside the model label.
  if (
    rawValueKey === 'product.specs.labels.model' &&
    !rawLabelKey &&
    /\b(months?|years?)\b/i.test(resolvedLabel)
  ) {
    const warrantyLabel = translateSpecLabel(lang, 'product.specs.labels.warranty');
    return warrantyLabel
      ? { label: warrantyLabel, value: resolvedLabel, labelKey: 'product.specs.labels.warranty' }
      : null;
  }

  // MobileCentre import sometimes puts warranty months beside the announcement-year label.
  if (
    rawValueKey === 'product.specs.labels.announcementYear' &&
    !rawLabelKey &&
    /\bmonths?\b/i.test(resolvedLabel)
  ) {
    const warrantyLabel = translateSpecLabel(lang, 'product.specs.labels.warranty');
    return warrantyLabel
      ? { label: warrantyLabel, value: resolvedLabel, labelKey: 'product.specs.labels.warranty' }
      : null;
  }

  // MobileCentre import sometimes puts product name beside the announcement-year label.
  if (
    rawValueKey === 'product.specs.labels.announcementYear' &&
    !rawLabelKey &&
    !/^\d{4}$/.test(resolvedLabel) &&
    !/\b(months?|years?)\b/i.test(resolvedLabel)
  ) {
    const modelLabel = translateSpecLabel(lang, 'product.specs.labels.model');
    return modelLabel
      ? { label: modelLabel, value: resolvedLabel, labelKey: 'product.specs.labels.model' }
      : null;
  }

  // MobileCentre import sometimes puts a year beside the operating-system label.
  if (
    rawValueKey === 'product.specs.labels.operatingSystem' &&
    !rawLabelKey &&
    /^\d{4}$/.test(resolvedLabel)
  ) {
    const announcementLabel = translateSpecLabel(lang, 'product.specs.labels.announcementYear');
    return announcementLabel
      ? { label: announcementLabel, value: resolvedLabel, labelKey: 'product.specs.labels.announcementYear' }
      : null;
  }

  if (shouldSwapSpecRow(resolvedLabel, resolvedValue)) {
    resolvedLabel = value;
    resolvedValue = label;
  }

  const labelKey = resolveRowLabelKey(resolvedLabel, resolvedValue);
  const valueKey = resolveSpecLabelKey(resolvedValue);

  if (labelKey === 'product.specs.labels.availableInStores') {
    return null;
  }

  if (labelKey && valueKey) {
    return null;
  }

  if (valueKey && !labelKey) {
    const translatedLabel = translateSpecLabel(lang, valueKey);
    if (!translatedLabel) {
      return applySemanticRecovery(undefined, resolvedLabel, resolvedValue, lang);
    }
    return applySemanticRecovery(valueKey, translatedLabel, resolvedLabel, lang);
  }

  if (labelKey) {
    const translatedLabel = translateSpecLabel(lang, labelKey);
    const displayLabel = translatedLabel || resolvedLabel;
    return applySemanticRecovery(labelKey, displayLabel, resolvedValue, lang);
  }

  if (!resolvedLabel || !resolvedValue) {
    return null;
  }

  if (PRODUCT_SPEC_STATUS_ONLY_ARMENIAN.has(resolvedLabel) && looksLikeSpecValue(resolvedValue)) {
    return null;
  }

  return applySemanticRecovery(undefined, resolvedLabel, resolvedValue, lang);
}

function mergeDuplicateSections(items: ParsedItem[]): ParsedItem[] {
  const merged: ParsedItem[] = [];
  let lastSectionSlug: string | null = null;

  for (const item of items) {
    if (item.type === 'section') {
      if (item.slug === lastSectionSlug) {
        continue;
      }
      lastSectionSlug = item.slug;
      merged.push(item);
      continue;
    }

    merged.push(item);
  }

  return merged;
}

function dedupeRows(rows: NormalizedSpecRow[]): NormalizedSpecRow[] {
  const seen = new Set<string>();
  const result: NormalizedSpecRow[] = [];

  for (const row of rows) {
    const key = `${row.labelKey ?? row.label.toLowerCase()}::${row.value.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(row);
  }

  return result;
}

function regroupRowsByCanonicalSection(rows: NormalizedSpecRow[]): NormalizedSpecSection[] {
  const grouped = new Map<string, NormalizedSpecRow[]>();

  for (const row of rows) {
    const slug = row.labelKey
      ? (PRODUCT_SPEC_LABEL_SECTION_SLUG[row.labelKey] ?? 'other')
      : 'other';
    const bucket = grouped.get(slug) ?? [];
    bucket.push(row);
    grouped.set(slug, bucket);
  }

  return PRODUCT_SPEC_SECTION_ORDER.map((slug) => ({
    slug,
    rows: dedupeRows(grouped.get(slug) ?? []),
  })).filter((section) => section.rows.length > 0);
}

function buildSectionsFromItems(
  items: ParsedItem[],
  lang: LanguageCode | undefined,
): NormalizedSpecSection[] {
  const normalizedRows: NormalizedSpecRow[] = [];

  for (const item of items) {
    if (item.type === 'section') {
      continue;
    }

    const normalized = normalizeRowPair(item.label, item.value, lang);
    if (normalized) {
      normalizedRows.push(normalized);
    }
  }

  return regroupRowsByCanonicalSection(normalizedRows);
}

export function normalizeProductSpecSections(
  items: ParsedItem[],
  lang: LanguageCode | undefined,
): NormalizedSpecSection[] {
  const mergedItems = mergeDuplicateSections(items);
  return buildSectionsFromItems(mergedItems, lang);
}

function stripProductStatusNoise(html: string): string {
  return html.replace(/<p class="product-status">[\s\S]*?<\/p>/g, '');
}

function renderSections(sections: NormalizedSpecSection[], lang: LanguageCode | undefined): string {
  let tableBody = '';

  for (const section of sections) {
    const i18nKey = SECTION_SLUG_TO_I18N_KEY[section.slug] ?? SECTION_SLUG_TO_I18N_KEY.other;
    const title = translateSpecLabel(lang, i18nKey);
    if (title) {
      tableBody += buildSectionRowHtml(section.slug, title);
    }

    for (const row of section.rows) {
      tableBody += buildSpecRowHtml(row.label, row.value, lang);
    }
  }

  if (!tableBody) {
    return '';
  }

  return `<table class="product-specs"><tbody>${tableBody}</tbody></table>`;
}

/**
 * Parses, normalizes, and rebuilds MobileCentre product specification tables.
 */
export function normalizeProductSpecsHtml(lang: LanguageCode | undefined, html: string): string {
  if (!html) {
    return html;
  }

  if (!html.includes('product-specs')) {
    return stripProductStatusNoise(html);
  }

  const tableMatch = html.match(/<table class="product-specs"><tbody>([\s\S]*?)<\/tbody><\/table>/);
  const prefix = html.slice(0, tableMatch?.index ?? html.length);
  const suffix = tableMatch ? html.slice((tableMatch.index ?? 0) + tableMatch[0].length) : '';

  const cleanedPrefix = stripProductStatusNoise(prefix);
  if (!tableMatch) {
    return cleanedPrefix;
  }

  const items = parseTableItems(tableMatch[1]);
  const sections = normalizeProductSpecSections(items, lang);
  const tableHtml = renderSections(sections, lang);

  return `${cleanedPrefix}${tableHtml}${suffix}`.trim();
}

export function parseProductSpecsTableItems(html: string): ParsedItem[] {
  const tableMatch = html.match(/<table class="product-specs"><tbody>([\s\S]*?)<\/tbody><\/table>/);
  if (!tableMatch) {
    return [];
  }
  return parseTableItems(tableMatch[1]);
}
