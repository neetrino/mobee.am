/**
 * Read-only audit for product specification normalization across the catalog.
 *
 * Usage:
 *   pnpm audit:product-specs
 *   pnpm audit:product-specs -- --strict
 *   pnpm audit:product-specs -- --locale hy --strict
 *   pnpm audit:product-specs -- --locale en --strict
 *   pnpm audit:product-specs -- --locale ru --strict
 *   pnpm audit:product-specs -- --all-locales --strict
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { LanguageCode } from '../src/lib/language';
import {
  ALL_AUDIT_LOCALES,
  auditProductDescriptionHtmlAllLocales,
  hasStrictAuditFailures,
  hasStrictFinalAuditFailures,
  renderSpecAuditMarkdown,
  summarizeSpecAudit,
  summarizeSpecAuditByLocale,
  type ProductSpecAuditResult,
} from '../src/lib/products/audit-product-spec-normalization';

const BATCH_SIZE = 100;
const REPORT_PATH = join(process.cwd(), 'audit', 'product-spec-normalization-audit.md');

function loadRootEnv(): void {
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function parseAuditLocales(argv: string[]): LanguageCode[] {
  const localeArgIndex = argv.findIndex((arg) => arg === '--locale');
  if (localeArgIndex >= 0) {
    const locale = argv[localeArgIndex + 1] as LanguageCode | undefined;
    if (!locale || !ALL_AUDIT_LOCALES.includes(locale)) {
      console.error(`Invalid --locale value. Expected one of: ${ALL_AUDIT_LOCALES.join(', ')}`);
      process.exit(1);
    }
    return [locale];
  }

  if (argv.includes('--all-locales')) {
    return [...ALL_AUDIT_LOCALES];
  }

  return [...ALL_AUDIT_LOCALES];
}

function hasMeaningfulDescription(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function pickPrimaryTranslation(
  translations: Array<{
    locale: string;
    title: string;
    slug: string;
    descriptionHtml: string | null;
  }>,
): {
  locale: LanguageCode;
  title: string;
  slug: string;
  descriptionHtml: string;
} | null {
  const withDescription = translations.filter((translation) =>
    hasMeaningfulDescription(translation.descriptionHtml),
  );
  if (withDescription.length === 0) {
    return null;
  }

  const preferred =
    withDescription.find((translation) => translation.locale === 'hy') ??
    withDescription.find((translation) => translation.locale === 'en') ??
    withDescription[0];

  return {
    locale: preferred.locale as LanguageCode,
    title: preferred.title,
    slug: preferred.slug,
    descriptionHtml: preferred.descriptionHtml ?? '',
  };
}

async function loadProductsWithDescriptions(): Promise<
  Array<{
    id: string;
    title: string;
    slug: string;
    descriptionHtml: string;
  }>
> {
  const { db } = await import('@white-shop/db');
  const products: Array<{
    id: string;
    title: string;
    slug: string;
    descriptionHtml: string;
  }> = [];

  let cursor: string | undefined;

  while (true) {
    const batch = await db.product.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      where: {
        deletedAt: null,
        translations: {
          some: {
            descriptionHtml: {
              not: null,
            },
          },
        },
      },
      select: {
        id: true,
        translations: {
          select: {
            locale: true,
            title: true,
            slug: true,
            descriptionHtml: true,
          },
        },
      },
    });

    if (batch.length === 0) {
      break;
    }

    for (const product of batch) {
      const primary = pickPrimaryTranslation(product.translations);
      if (!primary || !hasMeaningfulDescription(primary.descriptionHtml)) {
        continue;
      }

      products.push({
        id: product.id,
        title: primary.title,
        slug: primary.slug,
        descriptionHtml: primary.descriptionHtml,
      });
    }

    cursor = batch[batch.length - 1]?.id;
    if (batch.length < BATCH_SIZE) {
      break;
    }
  }

  return products;
}

async function main(): Promise<void> {
  loadRootEnv();

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required (set in .env)');
    process.exit(1);
  }

  const strictMode = process.argv.includes('--strict');
  const strictFinalMode = process.argv.includes('--strict-final');
  const includeRaw = process.argv.includes('--include-raw');
  const auditLocales = parseAuditLocales(process.argv);
  const baseUrl = process.env.APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

  console.log('[audit:product-specs] Loading products with descriptions...');
  const products = await loadProductsWithDescriptions();
  console.log(`[audit:product-specs] Loaded ${products.length} product(s)`);

  const auditResults: ProductSpecAuditResult[] = [];

  for (const product of products) {
    const localeResults = auditProductDescriptionHtmlAllLocales(
      product.id,
      product.slug,
      product.title,
      product.descriptionHtml,
      { includeRaw, auditFinalHtml: true },
      auditLocales,
    );
    auditResults.push(...localeResults);
  }

  const summary = summarizeSpecAudit(auditResults);
  const localeSummaries = summarizeSpecAuditByLocale(auditResults);
  let markdown = renderSpecAuditMarkdown(auditResults, summary, baseUrl);

  markdown += '\n## Per-locale summary\n\n';
  markdown += '| Locale | Products | Invalid pairs | Section as row | Label conflicts | Empty groups | Armenian labels |\n';
  markdown += '| ------ | -------- | ------------- | -------------- | --------------- | ------------ | --------------- |\n';
  for (const localeSummary of localeSummaries) {
    markdown += `| ${localeSummary.locale.toUpperCase()} | ${localeSummary.totalProductsScanned} | ${localeSummary.invalidSemanticPairs} | ${localeSummary.sectionHeaderAsRow} | ${localeSummary.labelKeyConflicts} | ${localeSummary.emptyGroups} | ${localeSummary.untranslatedArmenianLabels} |\n`;
  }
  markdown += '\n';

  mkdirSync(join(process.cwd(), 'audit'), { recursive: true });
  writeFileSync(REPORT_PATH, markdown, 'utf8');

  console.log(`[audit:product-specs] Report written to ${REPORT_PATH}`);
  console.log(`[audit:product-specs] Products scanned: ${summary.totalProductsScanned}`);
  console.log(`[audit:product-specs] Products with issues: ${summary.productsWithIssues}`);
  console.log(`[audit:product-specs] Invalid semantic pairs: ${summary.invalidSemanticPairs}`);
  console.log(`[audit:product-specs] Section header as row: ${summary.sectionHeaderAsRow}`);
  console.log(`[audit:product-specs] Label key conflicts: ${summary.labelKeyConflicts}`);
  console.log(`[audit:product-specs] Locales: ${auditLocales.join(', ')}`);
  console.log(`[audit:product-specs] Untranslated Armenian labels: ${summary.untranslatedArmenianLabels}`);

  if (strictFinalMode && hasStrictFinalAuditFailures(summary)) {
    console.error('[audit:product-specs] Strict-final mode failed.');
    process.exit(1);
  }

  if (strictMode && hasStrictAuditFailures(summary)) {
    console.error('[audit:product-specs] Strict mode failed.');
    process.exit(1);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    if (process.env.DATABASE_URL) {
      const { db } = await import('@white-shop/db');
      await db.$disconnect();
    }
  });
