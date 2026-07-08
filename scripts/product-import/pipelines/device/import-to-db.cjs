"use strict";

const path = require("path");
const fs = require("fs");
const { S3Client } = require("@aws-sdk/client-s3");
const { buildVariantMediaFromSource } = require("../../shared/mobilecentre-variant-media.cjs");
const { buildDescriptionHtml } = require("../../shared/mobilecentre-description-html.cjs");
const { slugify } = require("./normalize.cjs");
const { loadExistingCatalog, checkProductExists, checkVariantExists } = require("./check-existing-db.cjs");
const { OUT_DIR } = require("./dry-run.cjs");

const { cache } = require("../../paths.cjs");

const ROOT = path.join(__dirname, "../../../..");
const CACHE_FILE = cache.deviceSourceImportImageCache;
const AMD_RATE = 400;
const LOCALES = ["en", "hy", "ru"];
const DEFAULT_STOCK = 10;

const CATEGORY_LABELS = {
  "hair-dryers": {
    en: "Hair Dryers",
    hy: "Ֆены",
    ru: "Фены",
  },
  "game-consoles": {
    en: "Game Consoles",
    hy: "Խաղային կոնսոլներ",
    ru: "Игровые консоли",
  },
};

function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value[0] === '"' && value.at(-1) === '"') || (value[0] === "'" && value.at(-1) === "'")) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
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

function categorySlugForProduct(product) {
  return product.product_type === "dyson" ? "hair-dryers" : "game-consoles";
}

function brandSlugForProduct(product) {
  return product.product_type === "dyson" ? "dyson" : "sony";
}

function brandNameForProduct(product) {
  return product.product_type === "dyson" ? "Dyson" : "Sony";
}

async function ensureBrand(prisma, product) {
  const slug = brandSlugForProduct(product);
  const name = brandNameForProduct(product);
  return prisma.brand.upsert({
    where: { slug },
    create: {
      slug,
      published: true,
      translations: {
        create: LOCALES.map((locale) => ({ locale, name })),
      },
    },
    update: {},
    include: { translations: true },
  });
}

async function ensureCategory(prisma, product) {
  const slug = categorySlugForProduct(product);
  let category = await prisma.category.findFirst({
    where: { translations: { some: { slug, locale: "en" } } },
    include: { translations: true },
  });
  if (!category) {
    category = await prisma.category.create({
      data: {
        published: true,
        translations: {
          create: LOCALES.map((locale) => ({
            locale,
            title: CATEGORY_LABELS[slug][locale],
            slug,
            fullPath: slug,
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
  const dryPath = path.join(OUT_DIR, "device-products.dry-run.json");
  if (!fs.existsSync(dryPath)) throw new Error("Dry-run JSON missing. Run --dry-run first.");

  const payload = JSON.parse(fs.readFileSync(dryPath, "utf8"));
  const toImport = (payload.products || []).filter((product) => product.ready_to_import && product.db_status !== "exists");
  if (!toImport.length) {
    const result = {
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
    fs.writeFileSync(path.join(OUT_DIR, "device-import-result.json"), JSON.stringify(result, null, 2), "utf8");
    return result;
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
    for (const product of toImport) {
      const dup = checkProductExists(catalog, product);
      if (dup.exists) {
        duplicates += 1;
        skipped.push({
          model: product.normalized_model,
          reason: "duplicate_parent_in_db",
          db_product_id: dup.product?.id,
        });
        continue;
      }

      const brand = await ensureBrand(prisma, product);
      const category = await ensureCategory(prisma, product);
      const model = product.normalized_model;
      const slugBase = slugify(model);
      let slug = slugBase;
      let suffix = 1;
      while (await prisma.productTranslation.findFirst({ where: { slug, locale: "en" } })) {
        slug = `${slugBase}-${suffix++}`;
      }

      const descHtml =
        product.descriptionHtml || buildDescriptionHtml(product.description || product.specifications || null);
      const newVariants = product.variants.filter((variant) => variant.db_status === "new");
      const prepared = [];

      for (let index = 0; index < newVariants.length; index += 1) {
        const variant = newVariants[index];
        const variantDup = checkVariantExists(catalog, variant);
        if (variantDup.exists) {
          duplicates += 1;
          continue;
        }

        const sourcePid = String(variant.source_pid || variant.sku || index);
        const { imageUrl, media } = await buildVariantMediaFromSource({
          r2,
          bucket,
          publicUrlBase,
          sourcePid: `device-${sourcePid}`.replace(/[^\w-]/g, "-"),
          variant: {
            ...variant,
            product_url: variant.source_url,
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
          brandId: brand.id,
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
            sku: row.variant.sku || `${row.variant.source}-${row.sourcePid}`,
            price,
            priceOnRequest: false,
            stock: DEFAULT_STOCK,
            imageUrl: row.imageUrl,
            media: row.media,
            position: row.position,
            published: true,
            source: row.variant.source,
            sourcePid: String(row.sourcePid),
            sourceUrl: row.variant.source_url,
            attributes:
              row.variant.options && Object.keys(row.variant.options).length ? row.variant.options : undefined,
          },
        });
        variantCount += 1;
        createdVariants.push({
          product_model: model,
          product_type: product.product_type,
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
        product_type: product.product_type,
        product_id: created.id,
        slug,
        variants_created: variantCount,
        source_urls: product.source_urls,
      });

      catalog.push({
        id: created.id,
        title: model,
        slug,
        normalized_model: model,
        brandSlug: brand.slug,
        variants: prepared.map((row) => ({
          id: row.variant.id,
          source: row.variant.source,
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
        dyson_products_created: createdProducts.filter((row) => row.product_type === "dyson").length,
        playstation_products_created: createdProducts.filter((row) => row.product_type === "playstation").length,
        skipped: skipped.length,
        failed: failed.length,
        duplicates,
      },
      created_products: createdProducts,
      created_variants: createdVariants,
      skipped,
      failed,
    };

    fs.writeFileSync(path.join(OUT_DIR, "device-import-result.json"), JSON.stringify(result, null, 2), "utf8");
    return result;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { runImport, DEFAULT_STOCK, AMD_RATE };
