"use strict";

/**
 * Backfill missing product translation locales (hy/ru/en) from the best available title.
 * MEDIA-UNRELATED. Titles/slugs/descriptions only.
 *
 * Usage:
 *   node scripts/backfill-product-translation-locales.cjs
 *   node scripts/backfill-product-translation-locales.cjs --apply
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Client } = require("pg");

const TARGET_LOCALES = ["hy", "en", "ru"];
const REPORT_PATH = path.join(
  process.cwd(),
  "scripts",
  "backfill-product-translation-locales.dry-run.json",
);

function loadEnv(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function parseArgs(argv) {
  const args = { apply: false, help: false };
  for (const raw of argv) {
    if (raw === "--apply") args.apply = true;
    else if (raw === "--help" || raw === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${raw}`);
  }
  return args;
}

function createId() {
  return `c${crypto.randomBytes(12).toString("hex")}`;
}

function slugify(input) {
  return String(input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0531-\u0587\u0400-\u04ff]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "product";
}

function pickSourceTranslation(byLocale) {
  for (const locale of ["en", "hy", "ru"]) {
    const row = byLocale.get(locale);
    if (row && typeof row.title === "string" && row.title.trim()) {
      return row;
    }
  }
  for (const row of byLocale.values()) {
    if (row && typeof row.title === "string" && row.title.trim()) {
      return row;
    }
  }
  return null;
}

async function resolveUniqueSlug(client, locale, desiredSlug, productId) {
  const base = slugify(desiredSlug);
  let candidate = base;
  let attempt = 0;
  while (attempt < 50) {
    const { rows } = await client.query(
      `
      SELECT "productId"
      FROM product_translations
      WHERE locale = $1 AND slug = $2
      LIMIT 1
      `,
      [locale, candidate],
    );
    if (!rows[0] || rows[0].productId === productId) {
      return candidate;
    }
    attempt += 1;
    candidate = `${base}-${attempt + 1}`;
  }
  return `${base}-${createId().slice(1, 8)}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage:
  node scripts/backfill-product-translation-locales.cjs
  node scripts/backfill-product-translation-locales.cjs --apply`);
    return;
  }

  const env = loadEnv(path.join(process.cwd(), ".env"));
  if (!env.DIRECT_URL) throw new Error("Missing DIRECT_URL");

  const client = new Client({
    connectionString: env.DIRECT_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const report = {
    mode: args.apply ? "APPLY" : "DRY_RUN",
    generatedAt: new Date().toISOString(),
    totals: {
      productsScanned: 0,
      productsNeedingBackfill: 0,
      rowsToInsert: 0,
      rowsInserted: 0,
    },
    products: [],
  };

  try {
    const { rows: products } = await client.query(`
      SELECT
        p.id,
        EXISTS (
          SELECT 1 FROM product_variants v
          WHERE v."productId" = p.id AND v.source = 'marco'
        ) AS is_marco,
        (
          SELECT json_agg(json_build_object(
            'id', t.id,
            'locale', t.locale,
            'title', t.title,
            'slug', t.slug,
            'subtitle', t.subtitle,
            'descriptionHtml', t."descriptionHtml",
            'seoTitle', t."seoTitle",
            'seoDescription', t."seoDescription"
          ))
          FROM product_translations t
          WHERE t."productId" = p.id
        ) AS translations
      FROM products p
      WHERE p."deletedAt" IS NULL
      ORDER BY p.id
    `);

    report.totals.productsScanned = products.length;
    const plans = [];

    for (const product of products) {
      const byLocale = new Map();
      for (const tr of product.translations || []) {
        byLocale.set(tr.locale, tr);
      }
      const source = pickSourceTranslation(byLocale);
      if (!source) continue;

      const missing = [];
      for (const locale of TARGET_LOCALES) {
        const existing = byLocale.get(locale);
        if (existing && typeof existing.title === "string" && existing.title.trim()) {
          continue;
        }
        missing.push(locale);
      }
      if (missing.length === 0) continue;

      plans.push({
        productId: product.id,
        isMarco: Boolean(product.is_marco),
        sourceLocale: source.locale,
        sourceTitle: source.title,
        missingLocales: missing,
        source,
      });
    }

    report.totals.productsNeedingBackfill = plans.length;
    report.totals.rowsToInsert = plans.reduce(
      (n, p) => n + p.missingLocales.length,
      0,
    );
    report.products = plans.map((p) => ({
      productId: p.productId,
      isMarco: p.isMarco,
      sourceLocale: p.sourceLocale,
      sourceTitle: p.sourceTitle,
      missingLocales: p.missingLocales,
    }));

    console.log("Backfill product translation locales:");
    console.log(`  Products scanned: ${report.totals.productsScanned}`);
    console.log(`  Products needing backfill: ${report.totals.productsNeedingBackfill}`);
    console.log(`  Rows to insert: ${report.totals.rowsToInsert}`);
    console.log(
      `  Marco among them: ${plans.filter((p) => p.isMarco).length}`,
    );

    if (!args.apply) {
      fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
      console.log(`\nDry-run: ${REPORT_PATH}`);
      console.log("Re-run with --apply to write.");
      return;
    }

    await client.query("BEGIN");
    try {
      for (const plan of plans) {
        for (const locale of plan.missingLocales) {
          const existing = (await client.query(
            `
            SELECT id, title FROM product_translations
            WHERE "productId" = $1 AND locale = $2
            LIMIT 1
            `,
            [plan.productId, locale],
          )).rows[0];

          const slug = await resolveUniqueSlug(
            client,
            locale,
            plan.source.slug || plan.source.title,
            plan.productId,
          );

          if (existing) {
            await client.query(
              `
              UPDATE product_translations
              SET title = $2,
                  slug = $3,
                  subtitle = COALESCE(NULLIF(subtitle, ''), $4),
                  "descriptionHtml" = COALESCE(NULLIF("descriptionHtml", ''), $5),
                  "seoTitle" = COALESCE(NULLIF("seoTitle", ''), $6),
                  "seoDescription" = COALESCE(NULLIF("seoDescription", ''), $7)
              WHERE id = $1
              `,
              [
                existing.id,
                plan.source.title,
                slug,
                plan.source.subtitle || null,
                plan.source.descriptionHtml || null,
                plan.source.seoTitle || plan.source.title,
                plan.source.seoDescription || null,
              ],
            );
          } else {
            await client.query(
              `
              INSERT INTO product_translations (
                id, "productId", locale, title, slug, subtitle, "descriptionHtml",
                "seoTitle", "seoDescription"
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
              `,
              [
                createId(),
                plan.productId,
                locale,
                plan.source.title,
                slug,
                plan.source.subtitle || null,
                plan.source.descriptionHtml || null,
                plan.source.seoTitle || plan.source.title,
                plan.source.seoDescription || null,
              ],
            );
          }
          report.totals.rowsInserted += 1;
        }
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }

    const verify = await client.query(`
      SELECT
        COUNT(*)::int AS products,
        COUNT(*) FILTER (WHERE NOT EXISTS (
          SELECT 1 FROM product_translations t
          WHERE t."productId" = p.id AND t.locale = 'hy'
            AND t.title IS NOT NULL AND btrim(t.title) <> ''
        ))::int AS still_missing_hy,
        COUNT(*) FILTER (WHERE NOT EXISTS (
          SELECT 1 FROM product_translations t
          WHERE t."productId" = p.id AND t.locale = 'en'
            AND t.title IS NOT NULL AND btrim(t.title) <> ''
        ))::int AS still_missing_en,
        COUNT(*) FILTER (WHERE NOT EXISTS (
          SELECT 1 FROM product_translations t
          WHERE t."productId" = p.id AND t.locale = 'ru'
            AND t.title IS NOT NULL AND btrim(t.title) <> ''
        ))::int AS still_missing_ru
      FROM products p
      WHERE p."deletedAt" IS NULL AND p.published = true
    `);
    report.validation = verify.rows[0];
    console.log("\nValidation:", report.validation);

    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(`\nReport: ${REPORT_PATH}`);
  } finally {
    await client.end().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
