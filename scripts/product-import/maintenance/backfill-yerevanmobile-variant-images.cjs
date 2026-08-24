#!/usr/bin/env node
"use strict";

/**
 * Backfill per-variant images from YerevanMobile jsonConfig.images.
 *
 * Usage:
 *   node scripts/product-import/maintenance/backfill-yerevanmobile-variant-images.cjs --slug samsung-galaxy-s25-edge --dry-run
 *   node scripts/product-import/maintenance/backfill-yerevanmobile-variant-images.cjs --slug samsung-galaxy-s25-edge --apply
 */

const path = require("path");
const fs = require("fs");
const { S3Client } = require("@aws-sdk/client-s3");
const { fetchHtml } = require("../pipelines/apple/http.cjs");
const { parseJsonConfigVariants } = require("../shared/yerevanmobile-json-config.cjs");
const {
  buildVariantMediaFromSource,
  loadImageCache,
  saveImageCache,
} = require("../shared/mobilecentre-variant-media.cjs");
const { cache } = require("../paths.cjs");

const ROOT = path.join(__dirname, "../../..");
const DEFAULT_URL = "https://www.yerevanmobile.am/en/samsung-galaxy-s25-edge.html";

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

function parseArgs(argv) {
  const args = new Set(argv);
  const slugIdx = argv.indexOf("--slug");
  const urlIdx = argv.indexOf("--url");
  return {
    apply: args.has("--apply"),
    dryRun: !args.has("--apply"),
    slug: slugIdx >= 0 ? argv[slugIdx + 1] : "samsung-galaxy-s25-edge",
    sourceUrl: urlIdx >= 0 ? argv[urlIdx + 1] : DEFAULT_URL,
  };
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

function childIdFromSourcePid(sourcePid, sku) {
  const fromPid = String(sourcePid || "").split("-").pop();
  if (fromPid && /^\d+$/.test(fromPid)) return fromPid;
  const fromSku = String(sku || "").split("-").pop();
  if (fromSku && /^\d+$/.test(fromSku)) return fromSku;
  return null;
}

async function main() {
  loadEnv();
  const { apply, dryRun, slug, sourceUrl } = parseArgs(process.argv.slice(2));
  const { PrismaClient } = require("../../../shared/db/generated/client");
  const prisma = new PrismaClient();

  const r2 = createR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrlBase = process.env.R2_PUBLIC_URL;
  const skipR2 = !r2 || !bucket || !publicUrlBase;

  if (skipR2 && apply) {
    throw new Error("R2 env missing — cannot apply image uploads");
  }

  try {
    const translation = await prisma.productTranslation.findFirst({
      where: { slug, locale: "en" },
      include: {
        product: {
          include: {
            variants: { orderBy: { position: "asc" } },
          },
        },
      },
    });

    if (!translation?.product) {
      throw new Error(`Product not found for slug: ${slug}`);
    }

    const product = translation.product;
    const { text, status } = await fetchHtml(sourceUrl, { sleepMs: 150 });
    if (status >= 400 || text.length < 800) {
      throw new Error(`Failed to fetch source page (${status})`);
    }

    const parsedVariants = parseJsonConfigVariants(text, translation.title, sourceUrl, slug);
    const parsedByChildId = new Map(
      parsedVariants.map((variant) => {
        const childId = childIdFromSourcePid(variant.source_pid, variant.sku);
        return [childId, variant];
      }),
    );

    const plan = [];
    for (const dbVariant of product.variants) {
      const childId = childIdFromSourcePid(dbVariant.sourcePid, dbVariant.sku);
      const parsed = childId ? parsedByChildId.get(childId) : null;
      plan.push({
        sku: dbVariant.sku,
        childId,
        color: dbVariant.attributes?.color || parsed?.options?.color || null,
        currentImage: dbVariant.imageUrl?.slice(-60) || null,
        sourceImage: parsed?.image_url?.slice(-60) || null,
        hasSourceImage: Boolean(parsed?.image_url),
      });
    }

    console.log(JSON.stringify({ mode: dryRun ? "dry-run" : "apply", slug, plan }, null, 2));

    if (dryRun) {
      console.log("\nDry-run only. Re-run with --apply to upload and update variants.");
      return;
    }

    const imageCache = loadImageCache(cache.mobilecentreImageCache);
    let updated = 0;

    for (const dbVariant of product.variants) {
      const childId = childIdFromSourcePid(dbVariant.sourcePid, dbVariant.sku);
      const parsed = childId ? parsedByChildId.get(childId) : null;
      if (!parsed?.image_url) continue;

      const sourcePid = dbVariant.sourcePid || parsed.source_pid || `${slug}-${childId}`;
      const mediaResult = await buildVariantMediaFromSource({
        r2,
        bucket,
        publicUrlBase,
        sourcePid,
        variant: parsed,
        imageCache,
        skipR2,
        alt: translation.title,
      });

      if (!mediaResult.imageUrl) {
        console.warn(`  skip ${dbVariant.sku}: upload failed`);
        continue;
      }

      await prisma.productVariant.update({
        where: { id: dbVariant.id },
        data: {
          imageUrl: mediaResult.imageUrl,
          media: mediaResult.media,
        },
      });
      updated += 1;
      console.log(`  updated ${dbVariant.sku} -> ${mediaResult.imageUrl.slice(-55)}`);
    }

    saveImageCache(cache.mobilecentreImageCache, imageCache);
    console.log(`\nUpdated ${updated}/${product.variants.length} variants for ${slug}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("FATAL:", error.message);
  process.exit(1);
});
