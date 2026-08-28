"use strict";

const path = require("path");
const fs = require("fs");
const { S3Client } = require("@aws-sdk/client-s3");
const { buildVariantMediaFromSource } = require("../../shared/mobilecentre-variant-media.cjs");
const { buildDescriptionHtml } = require("../../shared/mobilecentre-description-html.cjs");
const { slugify } = require("./normalize.cjs");
const { loadExistingCatalog, checkProductExists, checkVariantExists } = require("./check-existing-db.cjs");
const { OUT_DIR } = require("./dry-run.cjs");
const { syncCatalogVariantColor } = require("../../shared/catalog-color-variant-sync.cjs");

const { cache } = require("../../paths.cjs");

const ROOT = path.join(__dirname, "../../../..");
const CACHE_FILE = cache.appleSourceImportImageCache;
const AMD_RATE = 400;
const LOCALES = ["en", "hy", "ru"];
const DEFAULT_STOCK = 5;

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

function detectCategory(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("iphone")) return "phones";
  if (n.includes("ipad")) return "tablets";
  if (n.includes("macbook") || n.includes("imac") || n.includes("mac mini") || n.includes("mac studio")) return "computers";
  if (n.includes("airpods")) return "headphones";
  if (n.includes("watch")) return "watches";
  if (n.includes("apple tv")) return "tvs";
  return "accessories";
}

const CATEGORY_LABELS = {
  phones: { en: "Phones", hy: "Հեռախոս", ru: "Телефоны" },
  tablets: { en: "Tablets", hy: "Պլանշետ", ru: "Планшеты" },
  computers: { en: "Computers", hy: "Համակարգիչ", ru: "Компьютеры" },
  watches: { en: "Watches", hy: "Ժամացույց", ru: "Часы" },
  headphones: { en: "Headphones", hy: "Ականջակալ", ru: "Наушники" },
  accessories: { en: "Accessories", hy: "Աքսեսուար", ru: "Аксեսուары" },
  tvs: { en: "TVs", hy: "Հեռուստացույց", ru: "Телевизоры" },
};

function createR2Client() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) return null;
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
}

async function runImport({ skipR2 = false, importAsDraft = false } = {}) {
  loadEnv();
  const dryPath = path.join(OUT_DIR, "new-apple-products.dry-run.json");
  if (!fs.existsSync(dryPath)) throw new Error("Dry-run JSON missing. Run --dry-run first.");

  const payload = JSON.parse(fs.readFileSync(dryPath, "utf8"));
  const toImport = (payload.products || []).filter((p) => p.ready_to_import && p.db_status === "new");
  if (!toImport.length) {
    return { imported: [], failed: [], skipped: payload.products?.length || 0, message: "Nothing new to import" };
  }

  const { PrismaClient } = require("../../shared/db/generated/client");
  const prisma = new PrismaClient();
  const catalog = await loadExistingCatalog();
  const r2 = skipR2 ? null : createR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrlBase = process.env.R2_PUBLIC_URL || "";
  const imageCache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) : {};

  const imported = [];
  const failed = [];

  try {
    const appleBrand = await prisma.brand.upsert({
      where: { slug: "apple" },
      create: { slug: "apple", published: true, translations: { create: LOCALES.map((l) => ({ locale: l, name: "Apple" })) } },
      update: {},
      include: { translations: true },
    });

    for (const product of toImport) {
      const dup = checkProductExists(catalog, product);
      if (dup.exists) {
        failed.push({ target: product.target_model, reason: "duplicate_parent_in_db", productId: dup.product?.id });
        continue;
      }

      const model = product.normalized_model || product.product_name;
      const catSlug = detectCategory(model);
      let category = await prisma.category.findFirst({
        where: { translations: { some: { slug: catSlug, locale: "en" } } },
        include: { translations: true },
      });
      if (!category) {
        category = await prisma.category.create({
          data: {
            published: true,
            translations: {
              create: LOCALES.map((l) => ({
                locale: l,
                title: CATEGORY_LABELS[catSlug]?.[l] || catSlug,
                slug: catSlug,
                fullPath: catSlug,
              })),
            },
          },
          include: { translations: true },
        });
      }

      const slugBase = slugify(model);
      let slug = slugBase;
      let n = 1;
      while (await prisma.productTranslation.findFirst({ where: { slug, locale: "en" } })) {
        slug = `${slugBase}-${n++}`;
      }

      const descHtml = product.descriptionHtml || buildDescriptionHtml(product.description || product.specifications || null);
      const newVariants = product.variants.filter((v) => v.db_status === "new");

      let defaultMedia = [];
      const prepared = [];
      for (let i = 0; i < newVariants.length; i++) {
        const v = newVariants[i];
        const vc = checkVariantExists(catalog, v);
        if (vc.exists) continue;

        const item = {
          ...v,
          product_url: v.source_url,
          image_url: v.image_url,
          gallery: v.gallery,
        };
        const sourcePid = String(v.source_pid || v.sku || `${v.source}-${i}`);
        const { imageUrl, media } = await buildVariantMediaFromSource({
          r2,
          bucket,
          publicUrlBase,
          sourcePid: `${v.source}-${sourcePid}`.replace(/[^\w-]/g, "-"),
          variant: item,
          imageCache,
          skipR2: skipR2 || !r2,
          alt: v.name || model,
        });
        if (!media.length && !skipR2) {
          failed.push({ target: product.target_model, variant: v.sku, reason: "image_upload_failed" });
          continue;
        }
        prepared.push({ v, imageUrl, media, position: i, sourcePid });
        if (!defaultMedia.length && media.length) defaultMedia = media;
      }

      if (!prepared.length) {
        failed.push({ target: product.target_model, reason: "no_new_variants_after_dedupe" });
        continue;
      }

      const productPublished = !product.import_as_draft && !importAsDraft;

      const created = await prisma.product.create({
        data: {
          brandId: appleBrand.id,
          media: defaultMedia,
          published: productPublished,
          featured: false,
          publishedAt: productPublished ? new Date() : null,
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
      for (const p of prepared) {
        const priceOnRequest = Boolean(p.v.price_on_request);
        const price = priceOnRequest
          ? 0
          : Math.round((Number(p.v.price) / AMD_RATE) * 100) / 100;
        const stock = priceOnRequest
          ? 0
          : p.v.stock_status === "out_of_stock"
            ? 0
            : DEFAULT_STOCK;
        const variant = await prisma.productVariant.create({
          data: {
            productId: created.id,
            sku: p.v.sku || `${p.v.source}-${p.sourcePid}`,
            price,
            priceOnRequest,
            stock,
            imageUrl: p.imageUrl,
            media: p.media,
            position: p.position,
            published: productPublished,
            source: p.v.source,
            sourcePid: String(p.sourcePid),
            sourceUrl: p.v.source_url,
            attributes: p.v.options && Object.keys(p.v.options).length ? p.v.options : undefined,
          },
        });
        await syncCatalogVariantColor(prisma, {
          productId: created.id,
          variantId: variant.id,
          attributes: p.v.options,
          media: p.media,
          name: p.v.name,
        });
        variantCount += 1;
        void variant;
      }

      imported.push({
        target: product.target_model,
        product: model,
        productId: created.id,
        variants: variantCount,
        source: product.primary_source,
        urls: product.source_urls,
        import_as_draft: !productPublished,
        no_price: product.import_as_draft || prepared.every((row) => row.v.price_on_request),
      });
    }

    fs.writeFileSync(CACHE_FILE, JSON.stringify(imageCache, null, 2));
    const result = { imported, failed, imported_count: imported.length };
    fs.writeFileSync(path.join(OUT_DIR, "import-result.json"), JSON.stringify(result, null, 2), "utf8");
    return result;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { runImport };
