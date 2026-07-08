"use strict";

const path = require("path");
const fs = require("fs");
const { S3Client } = require("@aws-sdk/client-s3");
const { buildVariantMediaFromSource } = require("../../../shared/mobilecentre-variant-media.cjs");
const { slugify } = require("../normalize.cjs");
const { checkProductExists, checkVariantExists } = require("../check-existing-db.cjs");
const { cache } = require("../../../paths.cjs");
const {
  ROOT,
  DRY_RUN_JSON,
  APPLY_RESULT_JSON,
  AMD_RATE,
  DEFAULT_STOCK,
  LOCALES,
  CATEGORY_SLUG,
} = require("./constants.cjs");
const { bustProductDetailCache } = require("./bust-product-cache.cjs");

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
  });
}

async function ensurePhonesCategory(prisma) {
  let category = await prisma.category.findFirst({
    where: { translations: { some: { slug: CATEGORY_SLUG, locale: "en" } } },
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
    });
  }
  return category;
}

function assertApplyAllowed(payload, confirmFlag) {
  if (!confirmFlag) throw new Error("Missing --confirm-samsung-full-catalog");
  if (!fs.existsSync(DRY_RUN_JSON)) throw new Error(`Dry-run JSON missing: ${DRY_RUN_JSON}`);
  if (payload.summary?.apply_blocked || payload.safety?.has_parser_errors) {
    throw new Error("Apply blocked: parser errors in dry-run");
  }
  if (payload.safety?.has_duplicate_variant_keys) {
    throw new Error("Apply blocked: duplicate variant keys in dry-run");
  }
  if (payload.safety?.blocked_retire_due_to_refs) {
    throw new Error("Apply blocked: generic variant retire blocked by cart/order refs");
  }
}

function isR2Url(url) {
  if (!url) return false;
  const base = process.env.R2_PUBLIC_URL || "";
  if (base && url.startsWith(base)) return true;
  return /r2\.cloudflarestorage\.com|\.r2\.dev/i.test(url);
}

async function prepareVariantMedia({ variant, model, source, r2, bucket, publicUrlBase, imageCache, skipR2, dbVariant }) {
  if (dbVariant?.imageUrl && isR2Url(dbVariant.imageUrl) && dbVariant.media_count > 0) {
    return { imageUrl: dbVariant.imageUrl, media: dbVariant.media || [], reused: true };
  }

  const sourcePid = String(variant.source_pid || variant.sourcePid || "variant");
  const prefix =
    source === "mobilecentre"
      ? `samsung-${sourcePid}`.replace(/[^\w-]/g, "-")
      : `ym-${sourcePid}`.replace(/[^\w-]/g, "-");

  const built = await buildVariantMediaFromSource({
    r2,
    bucket,
    publicUrlBase,
    sourcePid: prefix,
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

  return { ...built, reused: false };
}

async function applyCatalogPlan(payload, { skipR2 = false, confirmFlag = false } = {}) {
  loadEnv();
  assertApplyAllowed(payload, confirmFlag);

  const { PrismaClient } = require("../../../../../shared/db/generated/client");
  const prisma = new PrismaClient();
  const r2 = skipR2 ? null : createR2Client();
  if (!skipR2 && !r2) {
    throw new Error("R2 config missing. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.");
  }

  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrlBase = process.env.R2_PUBLIC_URL || "";
  const mcCacheFile = cache.samsungSourceImportImageCache;
  const ymCacheFile = cache.samsungYerevanmobileImportImageCache;
  const imageCache = {
    ...(fs.existsSync(mcCacheFile) ? JSON.parse(fs.readFileSync(mcCacheFile, "utf8")) : {}),
    ...(fs.existsSync(ymCacheFile) ? JSON.parse(fs.readFileSync(ymCacheFile, "utf8")) : {}),
  };

  const result = {
    generated_at: new Date().toISOString(),
    mode: "apply",
    summary: {
      products_created: 0,
      products_updated: 0,
      variants_created: 0,
      variants_updated: 0,
      variants_skipped: 0,
      descriptions_updated: 0,
      r2_uploaded: 0,
      r2_reused: 0,
      generic_unpublished: 0,
      failed: 0,
    },
    details: [],
    failed: [],
  };

  try {
    const samsungBrand = await ensureSamsungBrand(prisma);
    const category = await ensurePhonesCategory(prisma);
    const liveCatalog = await require("../check-existing-db.cjs").loadExistingCatalog();

    const actionable = payload.products.filter((product) =>
      ["create_product", "update_variants", "update_description"].includes(product.proposed_action),
    );

    for (const plan of actionable) {
      const parsed = payload.parsed_catalog?.[plan.product_name];
      if (!parsed) {
        result.failed.push({ model: plan.product_name, reason: "missing_parsed_catalog" });
        result.summary.failed += 1;
        continue;
      }

      const source = parsed.source;
      const model = plan.product_name;

      if (plan.actions.create_product) {
        const dup = checkProductExists(liveCatalog, { model });
        if (dup.exists) {
          result.summary.variants_skipped += 1;
          continue;
        }

        let slug = slugify(model);
        let suffix = 1;
        while (await prisma.productTranslation.findFirst({ where: { slug, locale: "en" } })) {
          slug = `${slugify(model)}-${suffix++}`;
        }

        const prepared = [];
        for (let index = 0; index < plan.actions.variants_to_create.length; index += 1) {
          const variant = plan.actions.variants_to_create[index];
          const mediaResult = await prepareVariantMedia({
            variant,
            model,
            source,
            r2,
            bucket,
            publicUrlBase,
            imageCache,
            skipR2,
          });
          if (!mediaResult.media.length && !skipR2) {
            result.failed.push({ model, variant: variant.name, reason: "image_upload_failed" });
            result.summary.failed += 1;
            continue;
          }
          if (mediaResult.reused) result.summary.r2_reused += 1;
          else result.summary.r2_uploaded += 1;
          prepared.push({ variant, ...mediaResult, position: index });
        }

        if (!prepared.length) continue;

        const created = await prisma.product.create({
          data: {
            brandId: samsungBrand.id,
            media: prepared.find((row) => row.media.length)?.media || [],
            published: true,
            featured: false,
            publishedAt: new Date(),
            primaryCategoryId: category.id,
            categories: { connect: [{ id: category.id }] },
            translations: {
              create: LOCALES.map((locale) => ({
                locale,
                title: model,
                slug,
                descriptionHtml: parsed.descriptionHtml || null,
              })),
            },
          },
        });

        for (const row of prepared) {
          const price = Math.round((Number(row.variant.price) / AMD_RATE) * 100) / 100;
          await prisma.productVariant.create({
            data: {
              productId: created.id,
              sku: row.variant.sku || `${source}-${row.variant.source_pid}`,
              price,
              priceOnRequest: false,
              stock: DEFAULT_STOCK,
              imageUrl: row.imageUrl,
              media: row.media,
              position: row.position,
              published: true,
              source,
              sourcePid: String(row.variant.source_pid),
              sourceUrl: row.variant.source_url || row.variant.product_url || plan.sourceUrl,
              attributes: row.variant.options || undefined,
            },
          });
          result.summary.variants_created += 1;
        }

        result.summary.products_created += 1;
        if (parsed.descriptionHtml) result.summary.descriptions_updated += 1;
        result.details.push({ model, action: "create_product", product_id: created.id, slug });
        continue;
      }

      if (!plan.db_product_id) {
        result.failed.push({ model, reason: "missing_db_product_id" });
        result.summary.failed += 1;
        continue;
      }

      let touched = false;

      if (plan.actions.update_description && parsed.descriptionHtml) {
        await prisma.productTranslation.updateMany({
          where: { productId: plan.db_product_id },
          data: { descriptionHtml: parsed.descriptionHtml },
        });
        result.summary.descriptions_updated += 1;
        touched = true;
      }

      const dbProduct = await prisma.product.findUnique({
        where: { id: plan.db_product_id },
        include: { variants: true },
      });

      for (const row of plan.actions.variants_to_update) {
        await prisma.productVariant.update({
          where: { id: row.db.id },
          data: {
            attributes: row.parsed.options || undefined,
            sourceUrl: row.parsed.source_url || row.parsed.product_url || plan.sourceUrl,
          },
        });
        result.summary.variants_updated += 1;
        touched = true;
      }

      let position = dbProduct?.variants.length || 0;
      for (const variant of plan.actions.variants_to_create) {
        const existing = checkVariantExists(liveCatalog, variant);
        if (existing.exists) {
          result.summary.variants_skipped += 1;
          continue;
        }

        const dbVariant = dbProduct?.variants.find((entry) => entry.id === variant.id);
        const mediaResult = await prepareVariantMedia({
          variant,
          model,
          source,
          r2,
          bucket,
          publicUrlBase,
          imageCache,
          skipR2,
          dbVariant,
        });

        if (!mediaResult.media.length && !skipR2 && !mediaResult.imageUrl) {
          result.failed.push({ model, variant: variant.name, reason: "image_upload_failed" });
          result.summary.failed += 1;
          continue;
        }

        if (mediaResult.reused) result.summary.r2_reused += 1;
        else result.summary.r2_uploaded += 1;

        const price = Math.round((Number(variant.price) / AMD_RATE) * 100) / 100;
        await prisma.productVariant.create({
          data: {
            productId: plan.db_product_id,
            sku: variant.sku || `${source}-${variant.source_pid}`,
            price,
            priceOnRequest: false,
            stock: DEFAULT_STOCK,
            imageUrl: mediaResult.imageUrl,
            media: mediaResult.media,
            position,
            published: true,
            source,
            sourcePid: String(variant.source_pid),
            sourceUrl: variant.source_url || variant.product_url || plan.sourceUrl,
            attributes: variant.options || undefined,
          },
        });
        position += 1;
        result.summary.variants_created += 1;
        touched = true;
      }

      for (const retire of plan.actions.generic_variants_to_retire) {
        if (!retire.safe_to_unpublish) continue;
        await prisma.productVariant.update({
          where: { id: retire.variant_id },
          data: { published: false },
        });
        result.summary.generic_unpublished += 1;
        touched = true;
      }

      if (touched) {
        result.summary.products_updated += 1;
        result.details.push({ model, action: plan.proposed_action, product_id: plan.db_product_id });
      }
    }

    fs.mkdirSync(path.dirname(APPLY_RESULT_JSON), { recursive: true });
    fs.writeFileSync(APPLY_RESULT_JSON, JSON.stringify(result, null, 2), "utf8");
    if (fs.existsSync(mcCacheFile)) fs.writeFileSync(mcCacheFile, JSON.stringify(imageCache, null, 2), "utf8");
    if (fs.existsSync(ymCacheFile)) fs.writeFileSync(ymCacheFile, JSON.stringify(imageCache, null, 2), "utf8");

    const slugsToBust = [
      ...new Set(
        result.details
          .map((row) => payload.products.find((product) => product.product_name === row.model)?.slug)
          .filter(Boolean),
      ),
    ];
    if (slugsToBust.length) {
      result.cache_bust = await bustProductDetailCache(slugsToBust);
    }

    return result;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { applyCatalogPlan, assertApplyAllowed };
