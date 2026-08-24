#!/usr/bin/env node
/**
 * Backfill MobileCentre variant galleries into ProductVariant.media
 * and reset Product.media to the default (first) variant gallery only.
 *
 * Usage:
 *   node scripts/backfill-mobilecentre-variant-media.cjs --dry-run
 *   CONFIRM_BACKFILL_VARIANT_MEDIA=YES node scripts/backfill-mobilecentre-variant-media.cjs
 */

"use strict";

const path = require("path");
const fs = require("fs");
const { S3Client } = require("@aws-sdk/client-s3");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v[0] === '"' && v.at(-1) === '"') || (v[0] === "'" && v.at(-1) === "'")) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv(path.join(__dirname, "../../../.env"));

const {
  buildVariantMediaFromSource,
  isMobileCentreUrl,
  mediaHasMobileCentreUrl,
  extractMediaUrl,
  loadImageCache,
  saveImageCache,
} = require("../shared/mobilecentre-variant-media.cjs");

const { PrismaClient } = require("../../../shared/db/generated/client");
const prisma = new PrismaClient();

const { cache } = require("../paths.cjs");

const ROOT = path.join(__dirname, "../../..");
const JSON_FILE = path.join(ROOT, "data/product-import/apple/mobilecentre_apple_variable_products.json");
const CACHE_FILE = cache.mobilecentreImageCache;
const DRY_RUN = process.argv.includes("--dry-run");
const CONFIRMED = process.env.CONFIRM_BACKFILL_VARIANT_MEDIA === "YES";

async function ensureVariantMediaColumn() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "product_variants"
    ADD COLUMN IF NOT EXISTS "media" JSONB[] DEFAULT ARRAY[]::JSONB[]
  `);
}

async function mediaColumnExists() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'product_variants'
        AND column_name = 'media'
    ) AS "exists"
  `);
  return Boolean(rows[0]?.exists);
}

async function fetchMcVariants() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      v.id,
      v.sku,
      v."sourcePid",
      v."imageUrl",
      v.media,
      v.position,
      v."productId",
      p.media AS "productMedia"
    FROM "product_variants" v
    JOIN "products" p ON p.id = v."productId" AND p."deletedAt" IS NULL
    WHERE v.sku LIKE 'mc-%'
    ORDER BY v."productId" ASC, v.position ASC
  `);

  return rows.map((row) => ({
    id: row.id,
    sku: row.sku,
    sourcePid: row.sourcePid,
    imageUrl: row.imageUrl,
    media: Array.isArray(row.media) ? row.media : [],
    position: row.position,
    productId: row.productId,
    product: { id: row.productId, media: row.productMedia || [] },
  }));
}

function createR2Client() {
  const { R2_ACCOUNT_ID: aid, R2_ACCESS_KEY_ID: kid, R2_SECRET_ACCESS_KEY: sec } = process.env;
  if (!aid || !kid || !sec) throw new Error("Missing R2 env vars");
  return new S3Client({
    region: "auto",
    endpoint: `https://${aid}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: kid, secretAccessKey: sec },
  });
}

function buildSourceIndex(groups) {
  const bySku = new Map();
  const bySourcePid = new Map();

  for (const group of groups) {
    if (!Array.isArray(group.variants)) continue;
    for (const variant of group.variants) {
      if (!variant.source_pid) continue;
      const sourcePid = String(variant.source_pid);
      const sku = `mc-${sourcePid}`;
      bySku.set(sku, { group, variant, sourcePid });
      bySourcePid.set(sourcePid, { group, variant, sourcePid });
    }
  }

  return { bySku, bySourcePid };
}

function variantMediaMatchesSourcePid(imageUrl, sourcePid, media) {
  if (!sourcePid) return true;
  const prefix = `/mobilecentre/${sourcePid}/`;
  if (imageUrl && !imageUrl.includes(prefix)) return false;
  if (!Array.isArray(media)) return Boolean(imageUrl?.includes(prefix));
  return media.every((item) => {
    const url = extractMediaUrl(item);
    return !url || url.includes(prefix);
  });
}
function countMobileCentreInRecord(productMedia, variant) {
  let count = 0;
  for (const item of productMedia || []) {
    if (isMobileCentreUrl(extractMediaUrl(item))) count++;
  }
  if (isMobileCentreUrl(variant.imageUrl)) count++;
  if (mediaHasMobileCentreUrl(variant.media)) count++;
  return count;
}

async function scanRemainingMobileCentreUrls() {
  const products = await prisma.product.findMany({ select: { media: true } });
  const variants = await prisma.productVariant.findMany({
    select: { imageUrl: true, media: true },
  });
  let count = 0;
  for (const p of products) {
    for (const m of p.media || []) {
      if (isMobileCentreUrl(extractMediaUrl(m))) count++;
    }
  }
  for (const v of variants) {
    if (isMobileCentreUrl(v.imageUrl)) count++;
    if (mediaHasMobileCentreUrl(v.media)) count++;
  }
  return count;
}

async function main() {
  console.log("\n═══════════════════════════════════════════════");
  console.log(`  MobileCentre Variant Media Backfill ${DRY_RUN ? "(DRY RUN)" : ""}`);
  console.log("═══════════════════════════════════════════════\n");

  if (!fs.existsSync(JSON_FILE)) {
    console.error(`❌ JSON not found: ${JSON_FILE}`);
    process.exit(1);
  }

  if (!DRY_RUN && !CONFIRMED) {
    console.error("❌ Set CONFIRM_BACKFILL_VARIANT_MEDIA=YES to run without --dry-run");
    process.exit(1);
  }

  const hasMediaColumn = await mediaColumnExists();
  if (!DRY_RUN && !hasMediaColumn) {
    await ensureVariantMediaColumn();
  }
  if (DRY_RUN && !hasMediaColumn) {
    console.log("ℹ  product_variants.media column not in DB yet — apply migration before real run.\n");
  }

  const groups = JSON.parse(fs.readFileSync(JSON_FILE, "utf8"));
  const sourceIndex = buildSourceIndex(groups);

  let dbVariants;
  try {
    dbVariants = await fetchMcVariants();
  } catch (error) {
    if (DRY_RUN && !hasMediaColumn) {
      const rows = await prisma.$queryRawUnsafe(`
        SELECT
          v.id,
          v.sku,
          v."sourcePid",
          v."imageUrl",
          v.position,
          v."productId",
          p.media AS "productMedia"
        FROM "product_variants" v
        JOIN "products" p ON p.id = v."productId" AND p."deletedAt" IS NULL
        WHERE v.sku LIKE 'mc-%'
        ORDER BY v."productId" ASC, v.position ASC
      `);
      dbVariants = rows.map((row) => ({
        id: row.id,
        sku: row.sku,
        sourcePid: row.sourcePid,
        imageUrl: row.imageUrl,
        media: [],
        position: row.position,
        productId: row.productId,
        product: { id: row.productId, media: row.productMedia || [] },
      }));
    } else {
      throw error;
    }
  }

  const stats = {
    productsAffected: new Set(),
    variantsAffected: 0,
    variantsWithGallery: 0,
    variantsWithoutGallery: 0,
    productMediaReduced: 0,
    mobileCentreUrlsInDb: 0,
    r2UploadsNeeded: 0,
    examples: [],
  };

  const plannedByProduct = new Map();

  for (const dbVariant of dbVariants) {
    const sourcePid = dbVariant.sourcePid || dbVariant.sku?.replace(/^mc-/, "");
    const lookup =
      sourceIndex.bySku.get(dbVariant.sku || "") ||
      (sourcePid ? sourceIndex.bySourcePid.get(String(sourcePid)) : null);

    if (!lookup) continue;

    const sourceGallery = Array.isArray(lookup.variant.gallery) ? lookup.variant.gallery : [];
    const hasSourceGallery = sourceGallery.length > 0 || lookup.variant.image_url;

    if (hasSourceGallery) stats.variantsWithGallery++;
    else stats.variantsWithoutGallery++;

    stats.mobileCentreUrlsInDb += countMobileCentreInRecord(
      dbVariant.product.media,
      dbVariant
    );

    const currentMediaCount = Array.isArray(dbVariant.media) ? dbVariant.media.length : 0;
    const needsMcCleanup =
      isMobileCentreUrl(dbVariant.imageUrl) ||
      mediaHasMobileCentreUrl(dbVariant.media) ||
      mediaHasMobileCentreUrl(dbVariant.product.media);

    const pathMismatch = !variantMediaMatchesSourcePid(
      dbVariant.imageUrl,
      sourcePid,
      dbVariant.media
    );

    const shouldUpdate =
      currentMediaCount === 0 ||
      needsMcCleanup ||
      isMobileCentreUrl(dbVariant.imageUrl) ||
      pathMismatch;

    if (!shouldUpdate && !hasSourceGallery) continue;

    stats.variantsAffected++;
    stats.productsAffected.add(dbVariant.productId);
    stats.r2UploadsNeeded += Math.max(sourceGallery.length, lookup.variant.image_url ? 1 : 0);

    if (!plannedByProduct.has(dbVariant.productId)) {
      plannedByProduct.set(dbVariant.productId, {
        productId: dbVariant.productId,
        currentMediaCount: Array.isArray(dbVariant.product.media)
          ? dbVariant.product.media.length
          : 0,
        variantUpdates: [],
      });
    }

    const plan = plannedByProduct.get(dbVariant.productId);
    plan.variantUpdates.push({
      id: dbVariant.id,
      sku: dbVariant.sku,
      sourcePid: lookup.sourcePid,
      sourceVariant: lookup.variant,
      alt: lookup.variant.name || lookup.group.name,
    });

    if (stats.examples.length < 10) {
      stats.examples.push({
        sku: dbVariant.sku,
        currentMedia: currentMediaCount,
        sourceGalleryCount: sourceGallery.length,
        productMediaCount: plan.currentMediaCount,
      });
    }
  }

  for (const plan of plannedByProduct.values()) {
    if (plan.currentMediaCount > 3) stats.productMediaReduced++;
  }

  console.log("Summary (planned changes):");
  console.log(`  products affected:          ${stats.productsAffected.size}`);
  console.log(`  variants affected:        ${stats.variantsAffected}`);
  console.log(`  variants with gallery:    ${stats.variantsWithGallery}`);
  console.log(`  variants without gallery: ${stats.variantsWithoutGallery}`);
  console.log(`  product.media reductions: ${stats.productMediaReduced}`);
  console.log(`  MobileCentre URLs in DB:  ${stats.mobileCentreUrlsInDb}`);
  console.log(`  R2 uploads needed:        ${stats.r2UploadsNeeded}`);
  console.log("\nFirst 10 examples:");
  for (const ex of stats.examples) {
    console.log(
      `  - ${ex.sku}: variantMedia=${ex.currentMedia}, sourceGallery=${ex.sourceGalleryCount}, productMedia=${ex.productMediaCount}`
    );
  }

  if (DRY_RUN) {
    console.log("\n✅ Dry run complete. No database changes made.\n");
    return;
  }

  const r2 = createR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrlBase = process.env.R2_PUBLIC_URL || "";
  const imageCache = loadImageCache(CACHE_FILE);
  let uploads = 0;
  let productsUpdated = 0;
  let variantsUpdated = 0;

  for (const plan of plannedByProduct.values()) {
    let defaultMedia = null;

    for (const update of plan.variantUpdates) {
      const { imageUrl, media } = await buildVariantMediaFromSource({
        r2,
        bucket,
        publicUrlBase,
        sourcePid: update.sourcePid,
        variant: update.sourceVariant,
        imageCache,
        alt: update.alt,
      });

      uploads += media.length;

      await prisma.productVariant.update({
        where: { id: update.id },
        data: { imageUrl, media },
      });
      variantsUpdated++;

      if (!defaultMedia && media.length) {
        defaultMedia = media;
      }
    }

    if (defaultMedia) {
      await prisma.product.update({
        where: { id: plan.productId },
        data: { media: defaultMedia },
      });
      productsUpdated++;
    }
  }

  saveImageCache(CACHE_FILE, imageCache);

  const remainingMc = await scanRemainingMobileCentreUrls();

  console.log("\n✅ Backfill complete.");
  console.log(`  products updated:   ${productsUpdated}`);
  console.log(`  variants updated:   ${variantsUpdated}`);
  console.log(`  R2 uploads:         ${uploads}`);
  console.log(`  MC URLs remaining:  ${remainingMc}\n`);
}

main()
  .catch((e) => {
    console.error("❌", e.message);
    console.error(e.stack);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
