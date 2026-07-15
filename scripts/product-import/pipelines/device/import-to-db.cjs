"use strict";

const path = require("path");
const fs = require("fs");
const { S3Client } = require("@aws-sdk/client-s3");
const { buildVariantMediaFromSource } = require("../../shared/mobilecentre-variant-media.cjs");
const { buildDescriptionHtml } = require("../../shared/mobilecentre-description-html.cjs");
const { slugify, categorySlugForParentModel } = require("./normalize.cjs");
const { loadExistingCatalog, checkProductExists, checkVariantExists } = require("./check-existing-db.cjs");
const { OUT_DIR } = require("./dry-run.cjs");
const {
  recoverDysonColorFromEvidence,
} = require("../../shared/dyson-color-registry.cjs");
const {
  ensureColorAttribute,
  ensureDysonAttributeValue,
  ensureDysonVariantColorOption,
  ensureDysonProductAttribute,
  mergeAttributesColor,
} = require("../../shared/dyson-color-attribute-sync.cjs");

const { cache } = require("../../paths.cjs");

const ROOT = path.join(__dirname, "../../../..");
const CACHE_FILE = cache.deviceSourceImportImageCache;
const AMD_RATE = 400;
const LOCALES = ["en", "hy", "ru"];
const DEFAULT_STOCK = 10;

const CATEGORY_LABELS = {
  "hair-dryers": {
    en: "Hair Dryers",
    hy: "Ֆեներ",
    ru: "Фены",
  },
  "hair-stylers": {
    en: "Hair Stylers",
    hy: "Մազերի հարդարման սարքեր",
    ru: "Стайлеры для волос",
  },
  "hair-straighteners": {
    en: "Hair Straighteners",
    hy: "Մազերի ուղղիչներ",
    ru: "Выпрямители для волос",
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
  const fromParent = categorySlugForParentModel(product.normalized_model || product.product_name);
  if (fromParent) return fromParent;
  if (product.category === "Hair Stylers") return "hair-stylers";
  if (product.category === "Hair Straighteners") return "hair-straighteners";
  if (product.category === "Hair Dryers") return "hair-dryers";
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

  const { PrismaClient } = require("../../../../shared/db/generated/client");
  const prisma = new PrismaClient();
  const catalog = await loadExistingCatalog();
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrlBase = process.env.R2_PUBLIC_URL || "";
  const imageCache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) : {};

  const createdProducts = [];
  const createdVariants = [];
  const skipped = [];
  const failed = [];
  const missingDysonColorRegistry = [];
  let duplicates = 0;
  let colorAttribute = null;

  async function createVariantWithRetry(data, attempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await prisma.productVariant.create({ data });
      } catch (error) {
        lastError = error;
        const message = String(error?.message || error);
        if (!/closed the connection|Can't reach database|Connection reset/i.test(message) || attempt === attempts) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
    throw lastError;
  }

  try {
    for (const product of toImport) {
      const existingParent = checkProductExists(catalog, product);
      const brand = await ensureBrand(prisma, product);
      const category = await ensureCategory(prisma, product);
      const model = product.normalized_model;
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
        if (existingParent.exists) {
          duplicates += 1;
          skipped.push({
            model,
            reason: "parent_exists_no_new_variants",
            db_product_id: existingParent.product?.id,
          });
        } else {
          failed.push({ model, reason: "no_new_variants_after_dedupe" });
        }
        continue;
      }

      let productId = existingParent.product?.id || null;
      let slug = existingParent.product?.slug || "";

      if (!productId) {
        const slugBase = slugify(model);
        slug = slugBase;
        let suffix = 1;
        while (await prisma.productTranslation.findFirst({ where: { slug, locale: "en" } })) {
          slug = `${slugBase}-${suffix++}`;
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
        productId = created.id;
        createdProducts.push({
          model,
          product_type: product.product_type,
          product_id: productId,
          slug,
          variants_created: 0,
          source_urls: product.source_urls,
          action: "created_parent",
        });
        catalog.push({
          id: productId,
          title: model,
          slug,
          normalized_model: model,
          brandSlug: brand.slug,
          variants: [],
        });
      } else if (descHtml) {
        // Backfill empty descriptions on existing parent when safe.
        const existing = await prisma.productTranslation.findFirst({
          where: { productId, locale: "en" },
        });
        if (existing && !existing.descriptionHtml) {
          await prisma.productTranslation.updateMany({
            where: { productId },
            data: { descriptionHtml: descHtml },
          });
        }
      }

      let variantCount = 0;
      const existingPosition =
        existingParent.product?.variants?.length ||
        (await prisma.productVariant.count({ where: { productId } }));

      for (const row of prepared) {
        const price = Math.round((Number(row.variant.price) / AMD_RATE) * 100) / 100;
        try {
          let attributes =
            row.variant.options && Object.keys(row.variant.options).length
              ? { ...row.variant.options }
              : undefined;

          let dysonColorEntry = null;
          if (product.product_type === "dyson") {
            const mediaAlt =
              Array.isArray(row.media) && row.media[0] && typeof row.media[0] === "object"
                ? row.media[0].alt || null
                : null;
            const recovered = recoverDysonColorFromEvidence({
              rawColor: attributes?.color,
              sku: row.variant.sku || `${row.variant.source}-${row.sourcePid}`,
              sourceUrl: row.variant.source_url,
              mediaAlt,
              title: model,
            });
            if (recovered.status === "resolved") {
              dysonColorEntry = recovered.entry;
              attributes = mergeAttributesColor(attributes || {}, recovered.entry.canonicalName);
            } else if (attributes?.color) {
              missingDysonColorRegistry.push({
                model,
                sku: row.variant.sku || `${row.variant.source}-${row.sourcePid}`,
                raw_color: attributes.color,
                reason: recovered.status === "manual_review" ? recovered.reason : "empty",
                source_url: row.variant.source_url,
              });
              // Keep JSON color name; do not assign gray HEX / silent fallback.
            }
          }

          const createdVariant = await createVariantWithRetry({
            productId,
            sku: row.variant.sku || `${row.variant.source}-${row.sourcePid}`,
            price,
            priceOnRequest: false,
            stock: DEFAULT_STOCK,
            imageUrl: row.imageUrl,
            media: row.media,
            position: existingPosition + row.position,
            published: true,
            source: row.variant.source,
            sourcePid: String(row.sourcePid),
            sourceUrl: row.variant.source_url,
            attributes,
          });

          if (product.product_type === "dyson" && dysonColorEntry) {
            if (!colorAttribute) {
              colorAttribute = await ensureColorAttribute(prisma);
            }
            const avResult = await ensureDysonAttributeValue(prisma, colorAttribute.id, dysonColorEntry, {
              apply: true,
            });
            if (!avResult.attributeValueId) {
              throw new Error(`Dyson AttributeValue missing for ${dysonColorEntry.canonicalName}`);
            }
            const optionResult = await ensureDysonVariantColorOption(prisma, {
              variantId: createdVariant.id,
              attributeId: colorAttribute.id,
              attributeValueId: avResult.attributeValueId,
              canonicalName: dysonColorEntry.canonicalName,
              apply: true,
            });
            if (optionResult.action === "manual_review") {
              throw new Error(`Dyson color option conflict: ${optionResult.reason}`);
            }
            await ensureDysonProductAttribute(prisma, productId, colorAttribute.id, true);
          }

          variantCount += 1;
          createdVariants.push({
            product_model: model,
            product_type: product.product_type,
            product_id: productId,
            variant_id: createdVariant.id,
            sku: createdVariant.sku,
            source_pid: createdVariant.sourcePid,
            price,
            stock: createdVariant.stock,
            color: dysonColorEntry?.canonicalName || attributes?.color || null,
          });
          const catalogRow = catalog.find((rowItem) => rowItem.id === productId);
          if (catalogRow) {
            catalogRow.variants.push({
              id: createdVariant.id,
              source: row.variant.source,
              sourcePid: String(row.sourcePid),
              dedupe_key: row.variant.dedupe_key,
            });
          }
        } catch (error) {
          failed.push({
            model,
            variant: row.variant.name,
            reason: `variant_create_failed: ${error.message}`,
          });
        }
      }

      const createdMeta = createdProducts.find((row) => row.product_id === productId);
      if (createdMeta) createdMeta.variants_created = variantCount;
      else {
        createdProducts.push({
          model,
          product_type: product.product_type,
          product_id: productId,
          slug,
          variants_created: variantCount,
          source_urls: product.source_urls,
          action: "added_variants_to_existing_parent",
        });
      }
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
        missing_dyson_color_registry: missingDysonColorRegistry.length,
      },
      created_products: createdProducts,
      created_variants: createdVariants,
      skipped,
      failed,
      missing_dyson_color_registry: missingDysonColorRegistry,
    };

    fs.writeFileSync(path.join(OUT_DIR, "device-import-result.json"), JSON.stringify(result, null, 2), "utf8");
    return result;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { runImport, DEFAULT_STOCK, AMD_RATE };
