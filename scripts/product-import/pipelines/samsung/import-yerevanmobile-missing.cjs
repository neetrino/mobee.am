#!/usr/bin/env node
"use strict";

const path = require("path");
const fs = require("fs");
const { S3Client } = require("@aws-sdk/client-s3");
const { buildVariantMediaFromSource } = require("../../shared/mobilecentre-variant-media.cjs");
const { buildDescriptionHtml } = require("../../shared/mobilecentre-description-html.cjs");
const { slugify } = require("./normalize.cjs");
const {
  loadExistingCatalog,
  checkProductExists,
  checkVariantExists,
} = require("./check-existing-db.cjs");

const { cache } = require("../../paths.cjs");
const { syncCatalogVariantColor } = require("../../shared/catalog-color-variant-sync.cjs");

const ROOT = path.join(__dirname, "../../../..");
const OUT_DIR = path.join(ROOT, "audit/product-import/samsung/yerevanmobile-missing-check");
const DRY_RUN_JSON = path.join(OUT_DIR, "yerevanmobile-samsung-missing.dry-run.json");
const CACHE_FILE = cache.samsungYerevanmobileImportImageCache;
const AMD_RATE = 400;
const LOCALES = ["en", "hy", "ru"];
const DEFAULT_STOCK = 10;
const CATEGORY_SLUG = "phones";
const SOURCE = "yerevanmobile";

const CATEGORY_LABELS = {
  phones: { en: "Phones", hy: "Հեռախոսներ", ru: "Телефоны" },
};

function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v[0] === '"' && v.at(-1) === '"') || (v[0] === "'" && v.at(-1) === "'")) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

function createR2Client() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) return null;
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
}

async function ensureSamsungBrand(prisma) {
  return prisma.brand.upsert({
    where: { slug: "samsung" },
    create: {
      slug: "samsung",
      published: true,
      translations: { create: LOCALES.map((locale) => ({ locale, name: "Samsung" })) },
    },
    update: {},
    include: { translations: true },
  });
}

async function ensurePhonesCategory(prisma) {
  let category = await prisma.category.findFirst({
    where: { translations: { some: { slug: CATEGORY_SLUG, locale: "en" } } },
    include: { translations: true },
  });
  if (!category) {
    category = await prisma.category.create({
      data: {
        published: true,
        translations: {
          create: LOCALES.map((locale) => ({
            locale,
            title: CATEGORY_LABELS.phones[locale],
            slug: CATEGORY_SLUG,
            fullPath: CATEGORY_SLUG,
          })),
        },
      },
      include: { translations: true },
    });
  }
  return category;
}

function loadDryRunPayload(filePath = DRY_RUN_JSON) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dry-run JSON missing: ${filePath}. Run yerevanmobile-missing-check.cjs first.`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function runImport({
  dryRun = false,
  skipR2 = false,
  dryRunPath = DRY_RUN_JSON,
  resultPath = path.join(OUT_DIR, "yerevanmobile-samsung-import-result.json"),
} = {}) {
  loadEnv();
  const payload = loadDryRunPayload(dryRunPath);
  const toImport = (payload.ready_to_import || []).filter((product) => product.ready_to_import);
  const catalog = dryRun ? await loadExistingCatalog() : null;

  const preview = {
    mode: dryRun ? "dry-run" : "import",
    source: toImport[0]?.source || SOURCE,
    summary: {
      ready_in_json: toImport.length,
      parent_products_to_create: 0,
      variants_to_create: 0,
      skipped_duplicates: 0,
      failed: 0,
    },
    would_create: [],
    skipped: [],
    failed: [],
  };

  if (!toImport.length) {
    preview.message = "Nothing ready to import";
    return preview;
  }

  if (dryRun) {
    for (const product of toImport) {
      const dup = checkProductExists(catalog, product);
      if (dup.exists) {
        preview.summary.skipped_duplicates += 1;
        preview.skipped.push({ model: product.model, reason: "duplicate_parent_in_db", db_id: dup.product?.id });
        continue;
      }
      const newVariants = product.variants.filter((variant) => !checkVariantExists(catalog, variant).exists);
      if (!newVariants.length) {
        preview.summary.skipped_duplicates += 1;
        preview.skipped.push({ model: product.model, reason: "all_variants_exist_in_db" });
        continue;
      }
      preview.summary.parent_products_to_create += 1;
      preview.summary.variants_to_create += newVariants.length;
      preview.would_create.push({
        model: product.model,
        product_title: product.product_title,
        variants: newVariants.length,
        source_urls: product.source_urls,
      });
    }
    return preview;
  }

  const r2 = skipR2 ? null : createR2Client();
  if (!skipR2 && !r2) {
    throw new Error("R2 config missing. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.");
  }

  const { PrismaClient } = require("../../shared/db/generated/client");
  const prisma = new PrismaClient();
  const liveCatalog = await loadExistingCatalog();
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrlBase = process.env.R2_PUBLIC_URL || "";
  const imageCache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) : {};
  const createdProducts = [];
  const createdVariants = [];
  const skipped = [];
  const failed = [];

  try {
    const samsungBrand = await ensureSamsungBrand(prisma);
    const category = await ensurePhonesCategory(prisma);

    for (const product of toImport) {
      const productSource = product.source || SOURCE;
      const dup = checkProductExists(liveCatalog, product);
      if (dup.exists) {
        preview.summary.skipped_duplicates += 1;
        skipped.push({ model: product.model, reason: "duplicate_parent_in_db", db_product_id: dup.product?.id });
        continue;
      }

      const model = product.model;
      const slugBase = slugify(model);
      let slug = slugBase;
      let suffix = 1;
      while (await prisma.productTranslation.findFirst({ where: { slug, locale: "en" } })) {
        slug = `${slugBase}-${suffix++}`;
      }

      const descHtml = buildDescriptionHtml(product.description || product.specifications || null);
      const newVariants = product.variants.filter((variant) => !checkVariantExists(liveCatalog, variant).exists);
      const prepared = [];

      for (let index = 0; index < newVariants.length; index += 1) {
        const variant = newVariants[index];
        const sourcePid = String(variant.source_pid || variant.sourcePid || index);
        const mediaPrefix =
          productSource === "mobilecentre"
            ? `samsung-${sourcePid}`.replace(/[^\w-]/g, "-")
            : `ym-${sourcePid}`.replace(/[^\w-]/g, "-");
        const { imageUrl, media } = await buildVariantMediaFromSource({
          r2,
          bucket,
          publicUrlBase,
          sourcePid: mediaPrefix,
          variant: {
            ...variant,
            product_url: variant.product_url || variant.source_url,
            image_url: variant.image_url,
            gallery: variant.gallery,
          },
          imageCache,
          skipR2: skipR2 || !r2,
          alt: variant.name || model,
        });

        if (!media.length && !skipR2) {
          failed.push({ model, variant: variant.name, reason: "image_upload_failed" });
          continue;
        }

        prepared.push({ variant, imageUrl, media, position: index, sourcePid });
      }

      if (!prepared.length) {
        failed.push({ model, reason: "no_new_variants_after_dedupe" });
        continue;
      }

      const defaultMedia = prepared.find((row) => row.media.length)?.media || [];
      const created = await prisma.product.create({
        data: {
          brandId: samsungBrand.id,
          media: defaultMedia,
          published: true,
          featured: false,
          publishedAt: new Date(),
          categoryIds: [category.id],
          primaryCategoryId: category.id,
          categories: { connect: [{ id: category.id }] },
          translations: {
            create: LOCALES.map((locale) => ({
              locale,
              title: model,
              slug,
              descriptionHtml: descHtml,
            })),
          },
        },
      });

      let variantCount = 0;
      for (const row of prepared) {
        const price = Math.round((Number(row.variant.price) / AMD_RATE) * 100) / 100;
        const createdVariant = await prisma.productVariant.create({
          data: {
            productId: created.id,
            sku:
              row.variant.sku ||
              (productSource === "mobilecentre"
                ? `mobilecentre-${row.sourcePid}`
                : `ym-${row.sourcePid}`),
            price,
            priceOnRequest: false,
            stock: DEFAULT_STOCK,
            imageUrl: row.imageUrl,
            media: row.media,
            position: row.position,
            published: true,
            source: productSource,
            sourcePid: String(row.sourcePid),
            sourceUrl: row.variant.product_url || row.variant.source_url,
            attributes:
              row.variant.options && Object.keys(row.variant.options).length
                ? row.variant.options
                : undefined,
          },
        });
        await syncCatalogVariantColor(prisma, {
          productId: created.id,
          variantId: createdVariant.id,
          attributes: row.variant.options,
          media: row.media,
          name: row.variant.name,
        });
        variantCount += 1;
        createdVariants.push({
          product_model: model,
          product_id: created.id,
          variant_id: createdVariant.id,
          sku: createdVariant.sku,
          source_pid: createdVariant.sourcePid,
          price,
          stock: createdVariant.stock,
        });
      }

      createdProducts.push({
        model,
        product_id: created.id,
        slug,
        variants_created: variantCount,
        source_urls: product.source_urls,
      });

      liveCatalog.push({
        id: created.id,
        title: model,
        slug,
        normalized_model: model.toLowerCase(),
        normalized_slug: slug,
        brandSlug: "samsung",
        categorySlugs: [CATEGORY_SLUG],
        variants: prepared.map((row) => ({
          source: SOURCE,
          sourcePid: String(row.sourcePid),
          dedupe_key: row.variant.dedupe_key,
        })),
      });
    }

    fs.writeFileSync(CACHE_FILE, JSON.stringify(imageCache, null, 2));

    const result = {
      mode: "import",
      source: SOURCE,
      summary: {
        parent_products_created: createdProducts.length,
        variants_created: createdVariants.length,
        skipped: skipped.length,
        failed: failed.length,
        duplicates: preview.summary.skipped_duplicates,
      },
      created_products: createdProducts,
      created_variants: createdVariants,
      skipped,
      failed,
    };

    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), "utf8");
    return result;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run") || !args.has("--import");
  const skipR2 = args.has("--skip-r2");

  const result = await runImport({ dryRun, skipR2 });
  console.log(JSON.stringify(result, null, 2));

  if (dryRun) {
    console.log("\nDry-run only. To import after review:");
    console.log("node scripts/product-import/pipelines/samsung/import-yerevanmobile-missing.cjs --import");
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("FATAL:", error.message);
    process.exit(1);
  });
}

module.exports = { runImport, DRY_RUN_JSON, OUT_DIR };
