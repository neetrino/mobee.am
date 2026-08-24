#!/usr/bin/env node
/**
 * scripts/import-mobilecentre-variable-clean.cjs
 *
 * Destructive clean re-import of MobileCentre Apple products.
 * Groups flat JSON variants into parent Product + ProductVariant records
 * using the existing variable-product architecture.
 *
 * PHASES:
 *  0 – Preflight safety check
 *  1 – Backup existing products to disk
 *  2 – Delete old product images from Cloudflare R2
 *  3 – Delete existing product records from DB (safe relational order)
 *  4 – Apply DDL for source tracking columns (idempotent)
 *  5 – Ensure attribute records exist (color / storage / connectivity / size / band_* / sim)
 *  7 – Import grouped products + variants with R2 image uploads
 *  9 – Verification summary
 *
 * Usage:
 *   node scripts/import-mobilecentre-variable-clean.cjs --confirm-destructive
 *   node scripts/import-mobilecentre-variable-clean.cjs --confirm-destructive --skip-r2
 */

"use strict";

const path = require("path");
const fs = require("fs");
const {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");

const {
  buildVariantMediaFromSource,
  isMobileCentreUrl,
  mediaHasMobileCentreUrl,
  extractMediaUrl,
} = require("../shared/mobilecentre-variant-media.cjs");
const { buildDescriptionHtml } = require("../shared/mobilecentre-description-html.cjs");

// ─── Load .env ─────────────────────────────────────────────────────────────────

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v[0] === '"' && v.at(-1) === '"') || (v[0] === "'" && v.at(-1) === "'"))
      v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv(path.join(__dirname, "../../../.env"));

const { PrismaClient } = require("../../../shared/db/generated/client");
// Use pooler URL — it auto-wakes the Neon compute on reconnect.
let prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

function isConnectionError(e) {
  const msg = e?.message || "";
  return (
    e?.errorCode === "P1001" ||
    e?.errorCode === "P1008" ||
    e?.errorCode === "P1017" ||
    /can't reach database|server has closed the connection|connection terminated|connection reset|econnreset|socket hang up|connection timed out|unexpected eof/i.test(msg)
  );
}

async function reconnectDb() {
  try { await prisma.$disconnect(); } catch {}
  await new Promise((r) => setTimeout(r, 3000));
  prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  });
  // Warm up the connection explicitly
  await prisma.$queryRaw`SELECT 1`;
  console.log("  ↩  DB reconnected.");
}

async function withRetry(fn, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (isConnectionError(e) && i < retries - 1) {
        console.warn(`\n  ⚠  DB connection lost (attempt ${i + 1}/${retries}), reconnecting...`);
        await reconnectDb();
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      throw e;
    }
  }
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const { cache } = require("../paths.cjs");

const ROOT = path.join(__dirname, "../../..");
const JSON_FILE = path.join(ROOT, "data/product-import/apple/mobilecentre_apple_variable_products.json");
const CACHE_FILE = cache.mobilecentreImageCache;
const R2_MC_PREFIX = "products/mobilecentre";
const AMD_RATE = 400;
const DEFAULT_STOCK = 5;
const SOURCE = "mobilecentre";
const LOCALES = ["en", "hy", "ru"];
const SKIP_R2 = process.argv.includes("--skip-r2");
const CONFIRM = process.argv.includes("--confirm-destructive");

const IMPORTER_SUPPORTED_OPTION_KEYS = new Set([
  "color",
  "storage",
  "connectivity",
  "size",
  "band_color",
  "band_type",
  "band_size",
  "case_material",
  "sim",
]);

/** JSON keys mapped to importer attribute keys (not treated as unsupported). */
const JSON_OPTION_KEY_ALIASES = { memory: "storage" };

// ─── R2 client ─────────────────────────────────────────────────────────────────

function createR2Client() {
  const { R2_ACCOUNT_ID: aid, R2_ACCESS_KEY_ID: kid, R2_SECRET_ACCESS_KEY: sec } = process.env;
  if (!aid || !kid || !sec) throw new Error("Missing R2 env vars: R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY");
  return new S3Client({
    region: "auto",
    endpoint: `https://${aid}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: kid, secretAccessKey: sec },
  });
}

// ─── Text helpers ─────────────────────────────────────────────────────────────

function normalizeModel(raw) {
  if (!raw || !raw.trim()) return null;
  return raw
    .replace(/^Mobile\s+Centre\.\s*-\s*/i, "")
    .replace(/^A\.\s+/i, "")
    .replace(/\(\.A\)\s*/g, "")
    .replace(/\s+/g, " ")
    .replace(/\/+/g, "/")
    .trim() || null;
}

function toSlug(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function detectCategory(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("iphone") || n.includes("smartphone")) return "phones";
  if (n.includes("ipad") || n.includes("tablet")) return "tablets";
  if (
    n.includes("macbook") ||
    n.includes("mac mini") ||
    n.includes("imac") ||
    n.includes("mac pro") ||
    n.includes("mac studio")
  ) {
    return "computers";
  }
  if (n.includes("airpods") || n.includes("airpod")) return "headphones";
  if (n.includes("airtag")) return "accessories";
  if (n.includes("apple watch") || n.includes("applewatch")) return "watches";
  if (n.includes("apple tv") || /\btv\b/.test(n)) return "tvs";
  return "accessories";
}

const CATEGORY_LABELS = {
  phones: { en: "Phones", hy: "Հեռախոս", ru: "Телефоны" },
  tablets: { en: "Tablets", hy: "Պլանշետ", ru: "Планшеты" },
  computers: { en: "Computers", hy: "Համակարգիչ", ru: "Компьютеры" },
  watches: { en: "Watches", hy: "Ժամացույց", ru: "Часы" },
  headphones: { en: "Headphones", hy: "Ականջակալ", ru: "Наушники" },
  accessories: { en: "Accessories", hy: "Աքսեսուար", ru: "Аксессуары" },
  tvs: { en: "TVs", hy: "Հեռուստացույց", ru: "Телевизоры" },
  "household-appliances": {
    en: "Household Appliances",
    hy: "Կենցաղային տեխնիկա",
    ru: "Бытовая техника",
  },
};

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function findOrCreateBrand(slug, name) {
  const existing = await prisma.brand.findUnique({ where: { slug } });
  if (existing) return existing;
  return prisma.brand.create({
    data: {
      slug,
      published: true,
      translations: { create: LOCALES.map((l) => ({ locale: l, name })) },
    },
  });
}

async function findOrCreateCategory(slug, labels) {
  const existing = await prisma.category.findFirst({
    where: { translations: { some: { locale: "en", slug } } },
  });
  if (existing) return existing;
  return prisma.category.create({
    data: {
      position: 0,
      published: true,
      media: [],
      translations: {
        create: LOCALES.map((locale) => ({
          locale,
          title: labels[locale] || labels.en,
          slug,
          fullPath: slug,
        })),
      },
    },
  });
}

async function generateUniqueSlug(model) {
  let base = toSlug(model);
  let slug = base;
  let attempt = 0;
  while (true) {
    const hit = await prisma.productTranslation.findFirst({ where: { locale: "en", slug } });
    if (!hit) return slug;
    attempt++;
    slug = `${base}-${attempt}`;
  }
}

function collectJsonOptionKeys(items) {
  const keys = new Set();
  for (const group of items) {
    for (const variant of group.variants || []) {
      const opts = variant.options || {};
      for (const [key, value] of Object.entries(opts)) {
        if (value != null && String(value).trim()) keys.add(key);
      }
    }
  }
  return keys;
}

function validateJsonOptionKeys(items) {
  const jsonKeys = collectJsonOptionKeys(items);
  const unsupported = [];
  for (const key of jsonKeys) {
    const mapped = JSON_OPTION_KEY_ALIASES[key] || key;
    if (!IMPORTER_SUPPORTED_OPTION_KEYS.has(mapped)) unsupported.push(key);
  }

  const jsonList = [...jsonKeys].sort();
  const supportedList = [...IMPORTER_SUPPORTED_OPTION_KEYS].sort();

  console.log("┌─ Option keys ──────────────────────────────────────");
  console.log(`│  JSON option keys:      ${jsonList.join(", ") || "(none)"}`);
  console.log(`│  Importer supported:    ${supportedList.join(", ")}`);
  if (unsupported.length) {
    console.log(`│  ❌ Unsupported in JSON: ${unsupported.join(", ")}`);
  } else {
    console.log("│  ✅ All JSON option keys are supported");
  }
  console.log("└────────────────────────────────────────────────────\n");

  return { jsonKeys, unsupported };
}

// ─── PHASE 0 ──────────────────────────────────────────────────────────────────

async function preflight() {
  console.log("\n═══════════════════════════════════════════════");
  console.log("  PHASE 0 — PREFLIGHT SAFETY CHECK");
  console.log("═══════════════════════════════════════════════\n");

  if (!fs.existsSync(JSON_FILE)) {
    console.error(`❌  JSON not found: ${JSON_FILE}`);
    process.exit(1);
  }

  let items;
  try {
    items = JSON.parse(fs.readFileSync(JSON_FILE, "utf8"));
  } catch (e) {
    console.error("❌  JSON parse error:", e.message);
    process.exit(1);
  }

  if (!Array.isArray(items) || !items.length) {
    console.error("❌  JSON is empty or not an array.");
    process.exit(1);
  }

  const r2Vars = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL"];
  const missingR2 = r2Vars.filter((v) => !process.env[v]);
  if (missingR2.length && !SKIP_R2) {
    console.error(`❌  Missing R2 env vars: ${missingR2.join(", ")}`);
    console.error("    Add --skip-r2 to run without R2 cleanup/upload.");
    process.exit(1);
  }

  const [productCount, variantCount] = await Promise.all([
    prisma.product.count(),
    prisma.productVariant.count(),
  ]);

  const allProducts = await prisma.product.findMany({ select: { media: true } });
  const allVariants = await prisma.productVariant.findMany({ select: { imageUrl: true } });
  const imageUrlSet = new Set();
  for (const p of allProducts) {
    for (const m of (p.media || [])) {
      if (m && typeof m === "object" && m.url) imageUrlSet.add(m.url);
    }
  }
  for (const v of allVariants) { if (v.imageUrl) imageUrlSet.add(v.imageUrl); }

  const dbUrl = process.env.DATABASE_URL || "";
  const dbHost = dbUrl.match(/@([^/?]+)/)?.[1] || "(unknown)";
  const bucket = process.env.R2_BUCKET_NAME || "(not set)";
  const variantCountJson = items.reduce(
    (sum, g) => sum + (Array.isArray(g.variants) ? g.variants.length : 0),
    0
  );
  const models = new Set(
    items
      .map((g) => normalizeModel(g.name))
      .filter(Boolean)
  );
  const isProd = /production|[-_]prod[-_]|\.prod\./i.test(dbUrl);

  console.log("┌─ Environment ──────────────────────────────────────");
  console.log(`│  DB host:            ${dbHost}`);
  console.log(`│  R2 bucket:          ${bucket}`);
  console.log(`│  Products in DB:     ${productCount}`);
  console.log(`│  Variants in DB:     ${variantCount}`);
  console.log(`│  Image URLs in DB:   ${imageUrlSet.size}`);
  console.log(`│  JSON parent groups:  ${items.length}`);
  console.log(`│  JSON variants:       ${variantCountJson}`);
  console.log(`│  Unique models:      ${models.size}`);
  if (SKIP_R2) console.log("│  ⚠   R2 cleanup/upload SKIPPED (--skip-r2)");
  if (isProd)  console.log("│  ⚠   PRODUCTION DB DETECTED");
  console.log("└────────────────────────────────────────────────────\n");

  const keyCheck = validateJsonOptionKeys(items);

  if (!CONFIRM) {
    console.error("❌  Refusing to proceed without --confirm-destructive flag.");
    console.error("    This operation deletes ALL products and product images.\n");
    process.exit(1);
  }
  if (isProd) {
    console.error("❌  Production environment detected. Aborting for safety.");
    process.exit(1);
  }
  if (keyCheck.unsupported.length) {
    console.error("❌  Aborting: JSON contains option keys the importer cannot map.");
    console.error("    Fix JSON or extend IMPORTER_SUPPORTED_OPTION_KEYS before import.\n");
    process.exit(1);
  }

  console.log("✅  Preflight passed.\n");
  return { items, imageUrls: [...imageUrlSet] };
}

// ─── PHASE 1 ──────────────────────────────────────────────────────────────────

async function backup(imageUrls) {
  console.log("═══════════════════════════════════════════════");
  console.log("  PHASE 1 — BACKUP");
  console.log("═══════════════════════════════════════════════\n");

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dir = path.join(ROOT, "backups", "mobilecentre-clean-import", ts);
  fs.mkdirSync(dir, { recursive: true });

  // Neon pooler may drop idle connections between preflight and backup.
  await withRetry(() => prisma.$queryRaw`SELECT 1`);

  const products = await withRetry(() =>
    prisma.product.findMany({
      include: {
        translations: true,
        variants: { include: { options: true } },
        labels: true,
      },
    })
  );

  const productIds = products.map((p) => p.id);
  const cartItems = productIds.length
    ? await withRetry(() =>
        prisma.cartItem.findMany({ where: { productId: { in: productIds } } })
      )
    : [];

  fs.writeFileSync(path.join(dir, "products-backup.json"), JSON.stringify(products, null, 2));
  fs.writeFileSync(path.join(dir, "product-image-urls.json"), JSON.stringify(imageUrls, null, 2));
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({
    timestamp: new Date().toISOString(),
    dbHost: (process.env.DATABASE_URL || "").match(/@([^/?]+)/)?.[1] || "unknown",
    r2Bucket: process.env.R2_BUCKET_NAME || null,
    productCount: products.length,
    variantCount: products.reduce((s, p) => s + p.variants.length, 0),
    imageCount: imageUrls.length,
    cartItemCount: cartItems.length,
  }, null, 2));

  const variantCount = products.reduce((s, p) => s + p.variants.length, 0);
  console.log(`✅  Backup saved to: ${dir}`);
  console.log(`    Products: ${products.length}  Variants: ${variantCount}  Images: ${imageUrls.length}\n`);
  return { dir, products, cartItemCount: cartItems.length };
}

// ─── PHASE 2 ──────────────────────────────────────────────────────────────────

async function cleanR2(imageUrls) {
  if (SKIP_R2) {
    console.log("⏭   Phase 2: R2 cleanup skipped (--skip-r2)\n");
    return { deleted: 0, failed: 0 };
  }

  console.log("═══════════════════════════════════════════════");
  console.log("  PHASE 2 — R2 IMAGE CLEANUP");
  console.log("═══════════════════════════════════════════════\n");

  const r2 = createR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  const pubBase = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

  // Keys from DB image URLs
  const dbKeys = new Set();
  for (const url of imageUrls) {
    if (pubBase && url.startsWith(pubBase + "/")) {
      dbKeys.add(url.slice(pubBase.length + 1));
    }
  }

  // Keys from R2 listing under products/mobilecentre/
  const listedKeys = new Set();
  let cont;
  do {
    const res = await r2.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: R2_MC_PREFIX + "/",
      ContinuationToken: cont,
    }));
    for (const obj of (res.Contents || [])) listedKeys.add(obj.Key);
    cont = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (cont);

  const toDelete = [...new Set([...dbKeys, ...listedKeys])];
  console.log(`  DB-referenced keys:   ${dbKeys.size}`);
  console.log(`  Listed under prefix:  ${listedKeys.size}`);
  console.log(`  Total to delete:      ${toDelete.length}\n`);

  let deleted = 0, failed = 0;
  for (let i = 0; i < toDelete.length; i += 1000) {
    const batch = toDelete.slice(i, i + 1000).map((k) => ({ Key: k }));
    try {
      const res = await r2.send(new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: batch, Quiet: false },
      }));
      deleted += (res.Deleted || []).length;
      for (const err of (res.Errors || [])) {
        failed++;
        console.warn(`  ⚠  Delete failed: ${err.Key} — ${err.Message}`);
      }
    } catch (e) {
      failed += batch.length;
      console.warn(`  ⚠  Batch delete error: ${e.message}`);
    }
  }

  // Reset image cache so old R2 URLs are not reused
  fs.writeFileSync(CACHE_FILE, "{}");

  console.log(`✅  R2 cleanup: deleted=${deleted}  failed=${failed}\n`);
  return { deleted, failed };
}

// ─── PHASE 3 ──────────────────────────────────────────────────────────────────

async function cleanDb() {
  console.log("═══════════════════════════════════════════════");
  console.log("  PHASE 3 — DATABASE CLEANUP");
  console.log("═══════════════════════════════════════════════\n");

  const before = {
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
    options: await prisma.productVariantOption.count(),
    labels: await prisma.productLabel.count(),
    cartItems: await prisma.cartItem.count(),
  };
  console.log("  Before:", before);

  // Null out OrderItem.variantId — FK is nullable (safe, preserves order history)
  await prisma.$executeRaw`UPDATE "order_items" SET "variantId" = NULL WHERE "variantId" IS NOT NULL`;

  // Delete cart items first (variant FK may be RESTRICT)
  await prisma.cartItem.deleteMany({});

  // Product reviews (may not exist as table yet — guard)
  try { await prisma.productReview.deleteMany({}); } catch {}

  // Product junctions and children
  await prisma.productLabel.deleteMany({});
  await prisma.productAttribute.deleteMany({});
  await prisma.productVariantOption.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.productTranslation.deleteMany({});

  // Products (cascades _ProductCategories M2M table)
  await prisma.product.deleteMany({});

  const after = {
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
  };
  console.log("  After:", after);
  console.log(`✅  DB cleanup complete.\n`);
  return before;
}

// ─── PHASE 4 ──────────────────────────────────────────────────────────────────

async function applyDDL() {
  console.log("═══════════════════════════════════════════════");
  console.log("  PHASE 4 — SOURCE TRACKING DDL");
  console.log("═══════════════════════════════════════════════\n");

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "product_variants"
    ADD COLUMN IF NOT EXISTS "source"    TEXT,
    ADD COLUMN IF NOT EXISTS "sourcePid" TEXT,
    ADD COLUMN IF NOT EXISTS "visibleId" TEXT,
    ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT,
    ADD COLUMN IF NOT EXISTS "media"     JSONB[] DEFAULT ARRAY[]::JSONB[]
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "product_variants_source_idx" ON "product_variants"("source")`
  );
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "product_variants_source_sourcePid_key"
    ON "product_variants"("source","sourcePid")
    WHERE "source" IS NOT NULL AND "sourcePid" IS NOT NULL
  `);
  console.log("✅  DDL applied: source, sourcePid, visibleId, sourceUrl columns ready.\n");
}

// ─── PHASE 5 ──────────────────────────────────────────────────────────────────

async function setupAttributes() {
  console.log("═══════════════════════════════════════════════");
  console.log("  PHASE 5 — ATTRIBUTE SETUP");
  console.log("═══════════════════════════════════════════════\n");

  const defs = [
    { key: "color", name: "Color", position: 0 },
    { key: "storage", name: "Storage", position: 1 },
    { key: "connectivity", name: "Connectivity", position: 2 },
    { key: "size", name: "Size", position: 3 },
    { key: "band_color", name: "Band Color", position: 4 },
    { key: "band_type", name: "Band Type", position: 5 },
    { key: "band_size", name: "Band Size", position: 6 },
    { key: "case_material", name: "Case Material", position: 7 },
    { key: "sim", name: "SIM", position: 8 },
  ];

  const attrMap = {};
  for (const def of defs) {
    let attr = await prisma.attribute.findUnique({ where: { key: def.key } });
    if (!attr) {
      attr = await prisma.attribute.create({
        data: {
          key: def.key, type: "select", filterable: true, position: def.position,
          translations: { create: LOCALES.map((l) => ({ locale: l, name: def.name })) },
        },
      });
      console.log(`  Created attribute: ${def.key}`);
    } else {
      console.log(`  Attribute exists:  ${def.key} (id: ${attr.id})`);
    }
    attrMap[def.key] = attr;
  }

  // Pre-load all existing attribute values into an in-memory lookup
  const valueCache = {};
  for (const key of Object.keys(attrMap)) {
    valueCache[key] = {};
    const vals = await prisma.attributeValue.findMany({
      where: { attributeId: attrMap[key].id },
      include: { translations: true },
    });
    for (const v of vals) {
      valueCache[key][v.value.toLowerCase()] = v;
      for (const t of v.translations) valueCache[key][t.label.toLowerCase()] = v;
    }
  }

  console.log(`\n✅  Attributes ready.\n`);
  return { attrMap, valueCache };
}

async function findOrCreateAttrValue(attrKey, rawValue, attrMap, valueCache) {
  if (!rawValue || !rawValue.trim()) return null;
  const label = rawValue.trim();
  const norm = label.toLowerCase();
  if (valueCache[attrKey][norm]) return valueCache[attrKey][norm];

  const posCount = await prisma.attributeValue.count({ where: { attributeId: attrMap[attrKey].id } });
  const av = await prisma.attributeValue.create({
    data: {
      attributeId: attrMap[attrKey].id,
      value: label,
      position: posCount,
      translations: { create: LOCALES.map((l) => ({ locale: l, label })) },
    },
  });
  valueCache[attrKey][norm] = av;
  return av;
}

// ─── PHASE 7 ──────────────────────────────────────────────────────────────────

async function importProducts(parentGroups, attrMap, valueCache) {
  console.log("═══════════════════════════════════════════════");
  console.log("  PHASE 7 — IMPORT");
  console.log("═══════════════════════════════════════════════\n");

  const r2 = SKIP_R2 ? null : createR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrlBase = process.env.R2_PUBLIC_URL || "";
  const imageCache = loadImageCacheSafe();

  let skipped = 0;
  let createdProducts = 0;
  let createdVariants = 0;
  let uploadedImages = 0;
  let failedImages = 0;
  const attrValuesBefore = await prisma.attributeValue.count();
  const appleBrand = await findOrCreateBrand("apple", "Apple");
  const catCache = {};
  let groupIdx = 0;

  for (const parentGroup of parentGroups) {
    groupIdx++;
    if (groupIdx % 5 === 0 || groupIdx === parentGroups.length) {
      process.stdout.write(`\r  Progress: ${groupIdx}/${parentGroups.length} products`);
    }

    const model = normalizeModel(parentGroup.name);
    if (!model) {
      console.warn(`\n  ⏭  Skip group (bad model): ${parentGroup.name}`);
      skipped++;
      continue;
    }

    const groupItems = Array.isArray(parentGroup.variants) ? parentGroup.variants : [];
    if (!groupItems.length) {
      skipped++;
      continue;
    }

    const catSlug = detectCategory(model);
    if (!catCache[catSlug]) {
      catCache[catSlug] = await withRetry(() =>
        findOrCreateCategory(catSlug, CATEGORY_LABELS[catSlug])
      );
    }
    const category = catCache[catSlug];

    const rawDesc =
      parentGroup.descriptionHtml ||
      parentGroup.description ||
      parentGroup.descriptionRaw ||
      null;
    const descHtml =
      parentGroup.descriptionHtml ||
      buildDescriptionHtml(typeof rawDesc === "string" ? rawDesc : null);
    const slug = await withRetry(() => generateUniqueSlug(model));

    let defaultVariantMedia = [];
    const preparedVariants = [];

    for (let vi = 0; vi < groupItems.length; vi++) {
      const item = groupItems[vi];
      if (!item.source_pid || !item.price) {
        console.warn(`\n  ⏭  Skip variant (missing pid/price): ${item.source_pid || "?"}`);
        continue;
      }

      const sourcePid = String(item.source_pid);
      const { imageUrl, media } = await buildVariantMediaFromSource({
        r2,
        bucket,
        publicUrlBase,
        sourcePid,
        variant: item,
        imageCache,
        skipR2: SKIP_R2,
        alt: item.name || model,
      });

      if (media.length) uploadedImages += media.length;
      if (!media.length && (item.image_url || (item.gallery && item.gallery.length))) {
        failedImages++;
      } else if (!media.length && !item.image_url && !(item.gallery && item.gallery.length)) {
        console.warn(`\n  ⚠  Variant ${sourcePid} has no images`);
      }

      preparedVariants.push({ item, sourcePid, imageUrl, media, position: vi });
      if (vi === 0 && media.length) defaultVariantMedia = media;

      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch {
        await reconnectDb();
      }
    }

    if (!preparedVariants.length) {
      skipped++;
      continue;
    }

    if (!defaultVariantMedia.length && preparedVariants[0].media.length) {
      defaultVariantMedia = preparedVariants[0].media;
    }

    let product;
    try {
      product = await withRetry(() =>
        prisma.product.create({
          data: {
            brandId: appleBrand.id,
            media: defaultVariantMedia,
            published: true,
            featured: false,
            publishedAt: new Date(),
            categoryIds: [category.id],
            primaryCategoryId: category.id,
            attributeIds: [],
            discountPercent: 0,
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
        })
      );
    } catch (e) {
      console.warn(`\n  ⚠  Product create failed (${model}): ${e.message}`);
      continue;
    }
    createdProducts++;

    const productAttrIds = new Set();

    for (const prepared of preparedVariants) {
      const { item, sourcePid, imageUrl, media, position } = prepared;
      const sku = `mc-${sourcePid}`;
      const price = Math.round((Number(item.price) / AMD_RATE) * 100) / 100;

      let variant;
      try {
        variant = await withRetry(() =>
          prisma.productVariant.create({
            data: {
              productId: product.id,
              sku,
              price,
              stock: DEFAULT_STOCK,
              imageUrl,
              media,
              position,
              published: true,
              attributes: null,
            },
          })
        );
      } catch (e) {
        console.warn(`\n  ⚠  Variant create failed (${sku}): ${e.message}`);
        continue;
      }
      createdVariants++;

      const sourceUrl = item.product_url || item.original_product_url || null;
      const visibleId = item.visible_id ? String(item.visible_id) : null;
      await prisma.$executeRaw`
        UPDATE "product_variants"
        SET "source"    = ${SOURCE},
            "sourcePid" = ${sourcePid},
            "visibleId" = ${visibleId},
            "sourceUrl" = ${sourceUrl}
        WHERE id = ${variant.id}
      `;

      const opts = item.options || {};
      const optDefs = [
        { key: "color", value: opts.color },
        { key: "storage", value: opts.storage || opts.memory },
        { key: "connectivity", value: opts.connectivity },
        { key: "size", value: opts.size },
        { key: "band_color", value: opts.band_color },
        { key: "band_type", value: opts.band_type },
        { key: "band_size", value: opts.band_size },
        { key: "case_material", value: opts.case_material },
        { key: "sim", value: opts.sim },
      ];
      const attrJsonMap = {};

      for (const opt of optDefs) {
        if (!opt.value || !String(opt.value).trim()) continue;
        const av = await findOrCreateAttrValue(opt.key, String(opt.value), attrMap, valueCache);
        if (!av) continue;

        await prisma.productVariantOption.create({
          data: {
            variantId: variant.id,
            attributeId: attrMap[opt.key].id,
            attributeKey: opt.key,
            valueId: av.id,
            value: av.value,
          },
        });
        productAttrIds.add(attrMap[opt.key].id);
        attrJsonMap[opt.key] = [av.value];
      }

      if (Object.keys(attrJsonMap).length) {
        const jsonStr = JSON.stringify(attrJsonMap);
        await prisma.$executeRaw`
          UPDATE "product_variants" SET "attributes" = ${jsonStr}::jsonb WHERE id = ${variant.id}
        `;
      }
    }

    const attrIdsArr = [...productAttrIds];
    if (attrIdsArr.length) {
      await prisma.product.update({
        where: { id: product.id },
        data: { attributeIds: attrIdsArr },
      });
      for (const attrId of attrIdsArr) {
        await prisma.productAttribute.upsert({
          where: { productId_attributeId: { productId: product.id, attributeId: attrId } },
          create: { productId: product.id, attributeId: attrId },
          update: {},
        });
      }
    }
  }

  fs.writeFileSync(CACHE_FILE, JSON.stringify(imageCache, null, 2));

  const attrValuesAfter = await prisma.attributeValue.count();
  const attrValueCreated = attrValuesAfter - attrValuesBefore;

  console.log(`\n\n✅  Import complete.`);
  console.log(`    Products:             ${createdProducts}`);
  console.log(`    Variants:             ${createdVariants}`);
  console.log(`    Skipped groups:       ${skipped}`);
  console.log(`    Images uploaded:      ${uploadedImages}`);
  console.log(`    Images failed:        ${failedImages}`);
  console.log(`    Attr values created:  ${attrValueCreated}\n`);
  return { createdProducts, createdVariants, skipped, uploadedImages, failedImages, attrValueCreated };
}

function loadImageCacheSafe() {
  if (!fs.existsSync(CACHE_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  } catch {
    return {};
  }
}

// ─── PHASE 9 ──────────────────────────────────────────────────────────────────

async function verify() {
  console.log("═══════════════════════════════════════════════");
  console.log("  PHASE 9 — VERIFICATION");
  console.log("═══════════════════════════════════════════════\n");

  const productCount = await prisma.product.count();
  const variantCount = await prisma.productVariant.count();
  const optionCount  = await prisma.productVariantOption.count();
  const noVariants   = await prisma.product.count({ where: { variants: { none: {} } } });
  const noSku        = await prisma.productVariant.count({ where: { sku: null } });
  const noImage      = await prisma.productVariant.count({ where: { imageUrl: null } });

  const orphanRows = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS orphan_variants
    FROM product_variants v
    LEFT JOIN products p ON p.id = v."productId"
    WHERE p.id IS NULL
  `;
  const orphanVariants = orphanRows[0]?.orphan_variants ?? 0;

  const variantsWithoutProductRows = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS cnt
    FROM product_variants v
    LEFT JOIN products p ON p.id = v."productId"
    WHERE p.id IS NULL
  `;
  const variantsWithoutProduct = variantsWithoutProductRows[0]?.cnt ?? 0;

  const noOptionsRows = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS cnt
    FROM product_variants v
    WHERE NOT EXISTS (
      SELECT 1 FROM product_variant_options o WHERE o."variantId" = v.id
    )
  `;
  const variantsWithoutOptions = noOptionsRows[0]?.cnt ?? 0;

  const optionKeyRows = await prisma.$queryRaw`
    SELECT "attributeKey", COUNT(*)::int AS cnt
    FROM product_variant_options
    GROUP BY "attributeKey"
    ORDER BY "attributeKey"
  `;

  // Scan for remaining mobilecentre.am URLs
  const products = await prisma.product.findMany({ select: { media: true } });
  const variants = await prisma.productVariant.findMany({ select: { imageUrl: true, media: true } });
  let mcInMedia = 0, mcInVariants = 0, mcInVariantMedia = 0;
  for (const p of products) {
    for (const m of (p.media || [])) {
      const url = extractMediaUrl(m);
      if (isMobileCentreUrl(url)) mcInMedia++;
    }
  }
  for (const v of variants) {
    if (isMobileCentreUrl(v.imageUrl)) mcInVariants++;
    if (mediaHasMobileCentreUrl(v.media)) mcInVariantMedia++;
  }

  const mcTotal = mcInMedia + mcInVariants + mcInVariantMedia;
  console.log(`  Products:                    ${productCount}`);
  console.log(`  Variants:                    ${variantCount}`);
  console.log(`  Variant options:             ${optionCount}`);
  console.log(`  Orphan variants:             ${orphanVariants}  ${orphanVariants === 0 ? "✅" : "❌"}`);
  console.log(`  Products without variants:   ${noVariants}  ${noVariants === 0 ? "✅" : "❌"}`);
  console.log(`  Variants without product:    ${variantsWithoutProduct}  ${variantsWithoutProduct === 0 ? "✅" : "❌"}`);
  console.log(`  Variants without options:    ${variantsWithoutOptions}  ${variantsWithoutOptions === 0 ? "✅" : "⚠"}`);
  console.log(`  Variants without SKU:        ${noSku}  ${noSku === 0 ? "✅" : "⚠"}`);
  console.log(`  Variants without imageUrl:   ${noImage}  ${SKIP_R2 ? "(skip-r2)" : noImage === 0 ? "✅" : "⚠"}`);
  console.log(`  mobilecentre.am in media:    ${mcInMedia}  ${mcInMedia === 0 ? "✅" : "❌"}`);
  console.log(`  mobilecentre.am in variants: ${mcInVariants}  ${mcInVariants === 0 ? "✅" : "❌"}`);
  console.log(`  mobilecentre.am in var media:${mcInVariantMedia}  ${mcInVariantMedia === 0 ? "✅" : "❌"}`);

  if (optionKeyRows.length) {
    console.log("  Option keys by attributeKey:");
    for (const row of optionKeyRows) {
      console.log(`    ${row.attributeKey}: ${row.cnt}`);
    }
  } else {
    console.log("  Option keys by attributeKey: (none)");
  }

  const imageOk = SKIP_R2 || mcTotal === 0;
  const integrityOk =
    orphanVariants === 0 &&
    noVariants === 0 &&
    variantsWithoutProduct === 0;
  const ok = productCount > 0 && variantCount > 0 && imageOk && integrityOk;

  console.log(`\n${ok ? "✅  IMPORT VERIFIED SUCCESSFULLY" : "⚠️   IMPORT COMPLETED WITH WARNINGS — check above"}\n`);
  return {
    productCount,
    variantCount,
    optionCount,
    orphanVariants,
    noVariants,
    variantsWithoutProduct,
    variantsWithoutOptions,
    noSku,
    noImage,
    mcInMedia,
    mcInVariants,
    mcInVariantMedia,
    optionKeyRows,
  };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n╔═════════════════════════════════════════════════╗");
  console.log("║  MobileCentre Variable Product Clean Import      ║");
  console.log("╚═════════════════════════════════════════════════╝");

  try {
    const { items, imageUrls } = await preflight();
    await backup(imageUrls);
    const r2Stats  = await cleanR2(imageUrls);
    const dbBefore = await cleanDb();
    await applyDDL();
    const { attrMap, valueCache } = await setupAttributes();
    const imp = await importProducts(items, attrMap, valueCache);
    const ver = await verify();

    console.log("═══════════════════════════════════════════════");
    console.log("  FINAL REPORT");
    console.log("═══════════════════════════════════════════════");
    console.log(`  R2 objects deleted:      ${r2Stats.deleted}`);
    console.log(`  DB products before:      ${dbBefore.products}`);
    console.log(`  Products imported:       ${imp.createdProducts}`);
    console.log(`  Variants imported:       ${imp.createdVariants}`);
    console.log(`  Skipped rows:            ${imp.skipped}`);
    console.log(`  Images uploaded:         ${imp.uploadedImages}`);
    console.log(`  Images failed:           ${imp.failedImages}`);
    console.log(`  Attr values created:     ${imp.attrValueCreated}`);
    console.log(`  MC hotlinks remaining:   ${ver.mcInMedia + ver.mcInVariants + ver.mcInVariantMedia}`);
    console.log("═══════════════════════════════════════════════\n");

    console.log("Manual checks to perform:");
    console.log("  1. Open /shop — verify parent product cards (not per-variant)");
    console.log("  2. Open a product PDP — verify color/storage/connectivity/size/band selectors");
    console.log("  3. Change variant — verify price and image update");
    console.log("  4. Add to cart — confirm variantId is stored");
    console.log("  5. Open /supersudo/products — verify product list and variants tab");
    console.log("");
  } catch (e) {
    console.error("\n❌  FATAL ERROR:", e.message);
    console.error(e.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
