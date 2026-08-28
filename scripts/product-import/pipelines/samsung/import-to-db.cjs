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
const { OUT_DIR } = require("./dry-run.cjs");
const { syncCatalogVariantColor } = require("../../shared/catalog-color-variant-sync.cjs");

const { cache } = require("../../paths.cjs");

const ROOT = path.join(__dirname, "../../../..");
const CACHE_FILE = cache.samsungSourceImportImageCache;
const AMD_RATE = 400;
const LOCALES = ["en", "hy", "ru"];
const DEFAULT_STOCK = 10;
const CATEGORY_SLUG = "phones";

function withColorFromVariantName(options, name) {
  if (options && typeof options === "object" && options.color) {
    return options;
  }
  const match = String(name || "").trim().match(/\(([^)]+)\)\s*$/);
  const color = match ? match[1].replace(/\s+/g, " ").trim() : "";
  if (!color || /^(?:\d+\s*(?:GB|TB)|4G|5G|LTE|eSIM)$/i.test(color)) {
    return options;
  }
  return { ...(options && typeof options === "object" ? options : {}), color };
}

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
      translations: {
        create: LOCALES.map((locale) => ({ locale, name: "Samsung" })),
      },
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

async function runImport({ skipR2 = false } = {}) {
  loadEnv();
  const dryPath = path.join(OUT_DIR, "samsung-db-import.dry-run.json");
  if (!fs.existsSync(dryPath)) {
    throw new Error("Dry-run JSON missing. Run --dry-run first.");
  }

  const payload = JSON.parse(fs.readFileSync(dryPath, "utf8"));
  const toImport = (payload.products || []).filter((product) => product.ready_to_import);
  if (!toImport.length) {
    return {
      summary: {
        parent_products_created: 0,
        variants_created: 0,
        skipped: payload.products?.length || 0,
        failed: 0,
        duplicates: 0,
      },
      created_products: [],
      created_variants: [],
      skipped: payload.products || [],
      failed: [],
      message: "Nothing new to import",
    };
  }

  const r2 = skipR2 ? null : createR2Client();
  if (!skipR2 && !r2) {
    throw new Error("R2 config missing. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.");
  }

  const { PrismaClient } = require("../../shared/db/generated/client");
  const prisma = new PrismaClient();
  const catalog = await loadExistingCatalog();
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrlBase = process.env.R2_PUBLIC_URL || "";
  const imageCache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) : {};

  const createdProducts = [];
  const createdVariants = [];
  const skipped = [];
  const failed = [];
  let duplicates = 0;

  try {
    const samsungBrand = await ensureSamsungBrand(prisma);
    const category = await ensurePhonesCategory(prisma);

    for (const product of toImport) {
      const dup = checkProductExists(catalog, product);
      if (dup.exists) {
        duplicates += 1;
        skipped.push({
          model: product.model,
          reason: "duplicate_parent_in_db",
          db_product_id: dup.product?.id,
        });
        continue;
      }

      const model = product.model;
      const slugBase = slugify(model);
      let slug = slugBase;
      let suffix = 1;
      while (await prisma.productTranslation.findFirst({ where: { slug, locale: "en" } })) {
        slug = `${slugBase}-${suffix++}`;
      }

      const descHtml =
        product.descriptionHtml ||
        buildDescriptionHtml(product.description || product.specifications || null);

      const newVariants = product.variants.filter((variant) => variant.db_status === "new");
      const prepared = [];

      for (let index = 0; index < newVariants.length; index += 1) {
        const variant = newVariants[index];
        const variantDup = checkVariantExists(catalog, variant);
        if (variantDup.exists) {
          duplicates += 1;
          continue;
        }

        const sourcePid = String(variant.source_pid || variant.sourcePid || index);
        const { imageUrl, media } = await buildVariantMediaFromSource({
          r2,
          bucket,
          publicUrlBase,
          sourcePid: `samsung-${sourcePid}`.replace(/[^\w-]/g, "-"),
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
          failed.push({
            model: product.model,
            variant: variant.name,
            reason: "image_upload_failed",
          });
          continue;
        }

        prepared.push({ variant, imageUrl, media, position: index, sourcePid });
      }

      if (!prepared.length) {
        failed.push({ model: product.model, reason: "no_new_variants_after_dedupe" });
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
        const attributes = withColorFromVariantName(row.variant.options, row.variant.name);
        const createdVariant = await prisma.productVariant.create({
          data: {
            productId: created.id,
            sku: row.variant.sku || `mobilecentre-${row.sourcePid}`,
            price,
            priceOnRequest: false,
            stock: DEFAULT_STOCK,
            imageUrl: row.imageUrl,
            media: row.media,
            position: row.position,
            published: true,
            source: "mobilecentre",
            sourcePid: String(row.sourcePid),
            sourceUrl: row.variant.product_url || row.variant.source_url,
            attributes:
              attributes && Object.keys(attributes).length ? attributes : undefined,
          },
        });
        await syncCatalogVariantColor(prisma, {
          productId: created.id,
          variantId: createdVariant.id,
          attributes,
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

      catalog.push({
        id: created.id,
        title: model,
        slug,
        normalized_model: model.toLowerCase(),
        normalized_slug: slug,
        brandSlug: "samsung",
        categorySlugs: [CATEGORY_SLUG],
        variants: prepared.map((row) => ({
          id: row.variant.id,
          source: "mobilecentre",
          sourcePid: String(row.sourcePid),
          dedupe_key: row.variant.dedupe_key,
        })),
      });
    }

    fs.writeFileSync(CACHE_FILE, JSON.stringify(imageCache, null, 2));

    const result = {
      summary: {
        parent_products_created: createdProducts.length,
        variants_created: createdVariants.length,
        skipped: skipped.length,
        failed: failed.length,
        duplicates,
      },
      created_products: createdProducts,
      created_variants: createdVariants,
      skipped,
      failed,
    };

    fs.writeFileSync(path.join(OUT_DIR, "samsung-import-result.json"), JSON.stringify(result, null, 2), "utf8");
    return result;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { runImport, DEFAULT_STOCK, AMD_RATE };
