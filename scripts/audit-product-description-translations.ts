/**
 * Audit localized product descriptions and spec label translations.
 *
 * Usage:
 *   pnpm audit:product-description-translations
 *   pnpm audit:product-description-translations -- --strict
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { LanguageCode } from '../src/lib/language';
import {
  auditProductDescriptionTranslations,
  hasDescriptionTranslationAuditFailures,
  renderDescriptionTranslationAuditMarkdown,
  summarizeDescriptionTranslationAudit,
  type ProductTranslationRecord,
} from '../src/lib/products/audit-product-description-translations';
import { auditProductDescriptionHtml } from '../src/lib/products/audit-product-spec-normalization';
import { getProductDescriptionHtml } from '../src/lib/products/get-product-description-html';

const BATCH_SIZE = 100;
const REPORT_PATH = join(process.cwd(), 'audit', 'product-description-translations-audit.md');

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

async function loadProductTranslations(): Promise<ProductTranslationRecord[]> {
  const { db } = await import('@white-shop/db');
  const records: ProductTranslationRecord[] = [];
  let cursor: string | undefined;

  while (true) {
    const batch = await db.product.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      where: { deletedAt: null },
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
      const translations: Partial<Record<LanguageCode, string | null>> = {};
      for (const translation of product.translations) {
        translations[translation.locale as LanguageCode] = translation.descriptionHtml;
      }

      const hy = product.translations.find((translation) => translation.locale === 'hy');
      const primary =
        hy ??
        product.translations.find((translation) => translation.locale === 'en') ??
        product.translations[0];

      if (!primary) {
        continue;
      }

      records.push({
        productId: product.id,
        slug: primary.slug,
        title: primary.title,
        translations,
      });
    }

    cursor = batch[batch.length - 1]?.id;
    if (batch.length < BATCH_SIZE) {
      break;
    }
  }

  return records;
}

async function main(): Promise<void> {
  loadRootEnv();

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required (set in .env)');
    process.exit(1);
  }

  const strictMode = process.argv.includes('--strict');
  const baseUrl = process.env.APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

  console.log('[audit:product-description-translations] Loading products...');
  const products = await loadProductTranslations();
  console.log(`[audit:product-description-translations] Loaded ${products.length} product(s)`);

  const rows = auditProductDescriptionTranslations(products);

  const specResults = products.flatMap((product) => {
    const hyHtml = product.translations.hy?.trim() ?? '';
    const sourceHtml =
      hyHtml ||
      product.translations.en?.trim() ||
      product.translations.ru?.trim() ||
      '';

    return (['hy', 'en', 'ru'] as const).map((locale) => {
      const rendered = getProductDescriptionHtml(locale, product.productId, {
        description: product.translations[locale] ?? null,
        sourceDescription: product.translations.hy ?? null,
      });

      return auditProductDescriptionHtml(
        product.productId,
        product.slug,
        product.title,
        rendered || sourceHtml,
        locale,
        { auditFinalHtml: true },
      );
    });
  });

  const summary = summarizeDescriptionTranslationAudit(rows, specResults);
  const markdown = renderDescriptionTranslationAuditMarkdown(rows, summary, baseUrl);

  mkdirSync(join(process.cwd(), 'audit'), { recursive: true });
  writeFileSync(REPORT_PATH, markdown, 'utf8');

  console.log(`[audit:product-description-translations] Report: ${REPORT_PATH}`);
  console.log(`[audit:product-description-translations] Missing EN: ${summary.missingEnglishDescriptions}`);
  console.log(`[audit:product-description-translations] Missing RU: ${summary.missingRussianDescriptions}`);
  console.log(
    `[audit:product-description-translations] Armenian labels EN/RU: ${summary.armenianLabelsInEnglishOutput}/${summary.armenianLabelsInRussianOutput}`,
  );

  if (strictMode && hasDescriptionTranslationAuditFailures(summary)) {
    console.error('[audit:product-description-translations] Strict mode failed.');
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
