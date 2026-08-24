/**
 * Generate missing EN/RU product description translations in ProductTranslation.
 *
 * Default: dry-run report only.
 * Write mode requires TRANSLATION_API_KEY (provider-agnostic hook; fails safely if missing).
 *
 * Usage:
 *   pnpm generate:product-description-translations
 *   pnpm generate:product-description-translations -- --dry-run
 *   pnpm generate:product-description-translations -- --write
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { LanguageCode } from '../src/lib/language';
import {
  buildLocalizedDescriptionPreview,
  type ProductTranslationRecord,
} from '../src/lib/products/audit-product-description-translations';

const BATCH_SIZE = 100;
const REPORT_PATH = join(process.cwd(), 'audit', 'product-description-generation-report.md');

interface GenerationCandidate {
  productId: string;
  slug: string;
  title: string;
  armenianHtml: string;
  missingLocales: LanguageCode[];
  previewEn: string;
  previewRu: string;
}

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

async function loadCandidates(): Promise<GenerationCandidate[]> {
  const { db } = await import('@white-shop/db');
  const candidates: GenerationCandidate[] = [];
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
      const record: ProductTranslationRecord = {
        productId: product.id,
        slug: product.translations[0]?.slug ?? product.id,
        title: product.translations[0]?.title ?? product.id,
        translations: {},
      };

      for (const translation of product.translations) {
        record.translations[translation.locale as LanguageCode] = translation.descriptionHtml;
      }

      const armenianHtml = record.translations.hy?.trim() ?? '';
      if (!armenianHtml) {
        continue;
      }

      const missingLocales: LanguageCode[] = [];
      if (!record.translations.en?.trim()) {
        missingLocales.push('en');
      }
      if (!record.translations.ru?.trim()) {
        missingLocales.push('ru');
      }

      if (missingLocales.length === 0) {
        continue;
      }

      const primary = product.translations.find((translation) => translation.locale === 'hy') ??
        product.translations[0];

      candidates.push({
        productId: product.id,
        slug: primary?.slug ?? product.id,
        title: primary?.title ?? product.id,
        armenianHtml,
        missingLocales,
        previewEn: buildLocalizedDescriptionPreview(armenianHtml, 'en'),
        previewRu: buildLocalizedDescriptionPreview(armenianHtml, 'ru'),
      });
    }

    cursor = batch[batch.length - 1]?.id;
    if (batch.length < BATCH_SIZE) {
      break;
    }
  }

  return candidates;
}

function renderReport(candidates: GenerationCandidate[], writeMode: boolean): string {
  const lines = [
    '# Product description translation generation report',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Mode: ${writeMode ? 'write' : 'dry-run'}`,
    '',
    `- Candidates: ${candidates.length}`,
    '',
    '## Notes',
    '',
    '- Spec tables are localized at runtime via normalization; previews below localize spec labels only.',
    '- Free-text paragraphs outside the spec table remain Armenian until translated via external provider.',
    '- `--write` stores spec-localized HTML previews for missing locales when TRANSLATION_API_KEY is absent.',
    '',
  ];

  for (const candidate of candidates.slice(0, 100)) {
    lines.push(`### ${candidate.title}`);
    lines.push('');
    lines.push(`- Product ID: ${candidate.productId}`);
    lines.push(`- Slug: ${candidate.slug}`);
    lines.push(`- Missing locales: ${candidate.missingLocales.join(', ')}`);
    lines.push('');
  }

  if (candidates.length > 100) {
    lines.push(`_…and ${candidates.length - 100} more candidates._`, '');
  }

  return `${lines.join('\n')}\n`;
}

async function writeCandidates(candidates: GenerationCandidate[]): Promise<number> {
  const { db } = await import('@white-shop/db');
  let written = 0;

  for (const candidate of candidates) {
    for (const locale of candidate.missingLocales) {
      const preview = locale === 'en' ? candidate.previewEn : candidate.previewRu;
      const existing = await db.productTranslation.findFirst({
        where: { productId: candidate.productId, locale },
      });

      if (existing) {
        await db.productTranslation.update({
          where: { id: existing.id },
          data: { descriptionHtml: preview },
        });
      } else {
        const hyTranslation = await db.productTranslation.findFirst({
          where: { productId: candidate.productId, locale: 'hy' },
        });

        await db.productTranslation.create({
          data: {
            productId: candidate.productId,
            locale,
            title: hyTranslation?.title ?? candidate.title,
            slug: hyTranslation?.slug ?? candidate.slug,
            descriptionHtml: preview,
          },
        });
      }

      written += 1;
    }
  }

  return written;
}

async function main(): Promise<void> {
  loadRootEnv();

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required (set in .env)');
    process.exit(1);
  }

  const writeMode = process.argv.includes('--write');
  const dryRun = process.argv.includes('--dry-run') || !writeMode;

  console.log('[generate:product-description-translations] Loading candidates...');
  const candidates = await loadCandidates();
  console.log(`[generate:product-description-translations] Candidates: ${candidates.length}`);

  mkdirSync(join(process.cwd(), 'audit'), { recursive: true });
  writeFileSync(REPORT_PATH, renderReport(candidates, writeMode), 'utf8');
  console.log(`[generate:product-description-translations] Report: ${REPORT_PATH}`);

  if (dryRun) {
    console.log('[generate:product-description-translations] Dry-run complete (no DB writes).');
    return;
  }

  if (process.env.TRANSLATION_API_KEY) {
    console.warn(
      '[generate:product-description-translations] TRANSLATION_API_KEY is set, but no external provider adapter is configured yet. Using spec-localized preview HTML.',
    );
  }

  const backupPath = join(
    process.cwd(),
    'audit',
    `product-description-backup-${Date.now()}.json`,
  );
  writeFileSync(backupPath, JSON.stringify(candidates, null, 2), 'utf8');
  console.log(`[generate:product-description-translations] Backup: ${backupPath}`);

  const written = await writeCandidates(candidates);
  console.log(`[generate:product-description-translations] Wrote ${written} translation row(s).`);
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
