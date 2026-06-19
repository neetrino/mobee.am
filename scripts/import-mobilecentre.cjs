#!/usr/bin/env node
/**
 * Imports MobileCentre Apple products:
 * 1. Downloads images from mobilecentre.am → uploads to Cloudflare R2
 * 2. Seeds products into the database via Prisma
 *
 * Usage: node scripts/import-mobilecentre.cjs [--skip-images]
 *   --skip-images  Skip R2 upload (use if images already uploaded)
 */

const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");
const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");

// ─── Load .env ────────────────────────────────────────────────────────────────
function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  fs.readFileSync(filePath, "utf8")
    .split("\n")
    .forEach((line) => {
      const t = line.trim();
      if (!t || t.startsWith("#")) return;
      const eq = t.indexOf("=");
      if (eq < 1) return;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    });
}
loadEnv(path.join(__dirname, "../.env"));

const { PrismaClient } = require("../shared/db/generated/client");
const prisma = new PrismaClient();

const PRODUCTS_JSON = path.join(__dirname, "../mobilecentre_all_apple_products.json");
const IMAGE_CACHE_FILE = path.join(__dirname, "../.mobilecentre-image-cache.json");
const R2_PREFIX = "products/mobilecentre";
const AMD_RATE = 400; // 1 USD = 400 AMD; prices in JSON are AMD → convert to USD base
const CONCURRENCY = 5;

// ─── R2 client ────────────────────────────────────────────────────────────────
function createR2Client() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error("Missing R2 env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
}

// ─── Download helpers ─────────────────────────────────────────────────────────
function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchBuffer(res.headers.location).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

function urlToR2Key(url) {
  const u = new URL(url);
  const filename = path.basename(u.pathname);
  return `${R2_PREFIX}/${filename}`;
}

async function uploadToR2(client, bucket, key, buffer, contentType) {
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType })
  );
  const base = process.env.R2_PUBLIC_URL.replace(/\/$/, "");
  return `${base}/${key}`;
}

async function r2KeyExists(client, bucket, key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

function guessMimeType(url) {
  const ext = path.extname(new URL(url).pathname).toLowerCase();
  const map = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };
  return map[ext] || "image/jpeg";
}

// ─── Upload all images ────────────────────────────────────────────────────────
async function uploadAllImages(products) {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("Missing R2_BUCKET_NAME");

  const cache = fs.existsSync(IMAGE_CACHE_FILE)
    ? JSON.parse(fs.readFileSync(IMAGE_CACHE_FILE, "utf8"))
    : {};

  const client = createR2Client();

  const allUrls = new Set();
  for (const p of products) {
    if (p.image_url) allUrls.add(p.image_url);
    for (const g of p.gallery || []) allUrls.add(g);
  }

  const uncached = [...allUrls].filter((u) => !cache[u]);
  console.log(`\n📸 Images: ${allUrls.size} total, ${uncached.length} to upload, ${allUrls.size - uncached.length} cached`);

  let uploaded = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < uncached.length; i += CONCURRENCY) {
    const batch = uncached.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (url) => {
        const key = urlToR2Key(url);
        try {
          const exists = await r2KeyExists(client, bucket, key);
          if (exists) {
            const base = process.env.R2_PUBLIC_URL.replace(/\/$/, "");
            cache[url] = `${base}/${key}`;
            uploaded++;
            return;
          }
          const buf = await fetchBuffer(url);
          const r2Url = await uploadToR2(client, bucket, key, buf, guessMimeType(url));
          cache[url] = r2Url;
          uploaded++;
          if (uploaded % 20 === 0) {
            process.stdout.write(`\r  Uploaded: ${uploaded}/${uncached.length}`);
            fs.writeFileSync(IMAGE_CACHE_FILE, JSON.stringify(cache, null, 2));
          }
        } catch (err) {
          failed++;
          console.warn(`\n  ⚠ Failed: ${url} — ${err.message}`);
          cache[url] = url; // fallback: keep original URL
        }
      })
    );
  }

  fs.writeFileSync(IMAGE_CACHE_FILE, JSON.stringify(cache, null, 2));
  console.log(`\n  ✓ Done: ${uploaded} uploaded, ${failed} failed`);
  return cache;
}

// ─── Description parser ───────────────────────────────────────────────────────
const NOISE_PATTERNS = [
  /Նշված արժեքը/,
  /Ապառիկը ձևակերպելիս/,
  /Յունիբանկ/,
  /ԱԿԲԱ Բանկ/,
  /Ինեկոբանկ/,
  /ՎՏԲ/,
  /unibank\.am/,
  /acba\.am/,
  /inecobank\.am/,
  /vtb\.am/,
  /Tweet/,
  /Share/,
  /Դուք հաջողությամբ/,
  /Ապրանքը պահպանված/,
  /Բոնուսային միավոր/,
  /Մեր մասին/,
  /© 20/,
  /MobileCentre/,
  /\+374/,
];

const SECTION_HEADERS = new Set([
  "Հիշողություն և Պրոցեսոր",
  "Ցանց",
  "Սնուցում",
  "Այլ",
  "Տեսախցիկներ",
  "Էկրան",
]);

/**
 * Converts pipe-separated mobilecentre description into readable HTML.
 * Format: "Label | Value | Label | Value | ..."
 */
function buildDescriptionHtml(raw) {
  if (!raw) return null;

  const parts = raw
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  const rows = [];
  let i = 0;

  while (i < parts.length) {
    const token = parts[i];

    // Stop at noise
    if (NOISE_PATTERNS.some((p) => p.test(token))) break;

    // Skip URLs
    if (token.startsWith("http")) { i++; continue; }

    // Section header
    if (SECTION_HEADERS.has(token)) {
      rows.push({ type: "section", label: token });
      i++;
      continue;
    }

    // Key-value pair
    const next = parts[i + 1];
    if (next && !NOISE_PATTERNS.some((p) => p.test(next)) && !next.startsWith("http")) {
      rows.push({ type: "row", label: token, value: next });
      i += 2;
    } else {
      // Single item (availability status etc.)
      if (token.length < 80) rows.push({ type: "status", label: token });
      i++;
    }
  }

  if (rows.length === 0) return null;

  const statusRows = rows.filter((r) => r.type === "status");
  const specRows = rows.filter((r) => r.type === "row" || r.type === "section");

  let html = "";

  if (statusRows.length > 0) {
    html += `<p class="product-status">${statusRows.map((r) => r.label).join(" · ")}</p>`;
  }

  if (specRows.length > 0) {
    html += `<table class="product-specs"><tbody>`;
    for (const row of specRows) {
      if (row.type === "section") {
        html += `<tr class="specs-section"><td colspan="2">${row.label}</td></tr>`;
      } else {
        html += `<tr><td class="spec-label">${row.label}</td><td class="spec-value">${row.value}</td></tr>`;
      }
    }
    html += `</tbody></table>`;
  }

  return html || null;
}

// ─── Name helpers ─────────────────────────────────────────────────────────────
function cleanName(raw) {
  return raw.replace(/^Mobile Centre\.\s*-\s*/i, "").trim();
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
  const n = name.toLowerCase();
  if (n.includes("iphone")) return "iphone";
  if (n.includes("ipad") || n.includes("a. ipad")) return "ipad";
  if (n.includes("macbook") || n.includes("mac mini") || n.includes("imac")) return "mac";
  if (n.includes("airpods") || n.includes("airpod")) return "airpods";
  if (n.includes("airtag")) return "airtag";
  if (n.includes("apple watch") || n.includes("applewatch")) return "apple-watch";
  if (n.includes("apple tv")) return "apple-tv";
  return "accessories";
}

const CATEGORY_LABELS = {
  iphone: { en: "iPhone", hy: "iPhone", ru: "iPhone" },
  ipad: { en: "iPad", hy: "iPad", ru: "iPad" },
  mac: { en: "Mac", hy: "Mac", ru: "Mac" },
  airpods: { en: "AirPods", hy: "AirPods", ru: "AirPods" },
  airtag: { en: "AirTag", hy: "AirTag", ru: "AirTag" },
  "apple-watch": { en: "Apple Watch", hy: "Apple Watch", ru: "Apple Watch" },
  "apple-tv": { en: "Apple TV", hy: "Apple TV", ru: "Apple TV" },
  accessories: { en: "Accessories", hy: "Աքսեսուարներ", ru: "Аксессуары" },
};

// ─── DB helpers ───────────────────────────────────────────────────────────────
async function findOrCreateBrand(slug, name) {
  let b = await prisma.brand.findUnique({ where: { slug } });
  if (b) return b;
  return prisma.brand.create({
    data: {
      slug,
      published: true,
      translations: { create: { locale: "en", name } },
    },
  });
}

async function findOrCreateCategory(slug, labels, parentId) {
  const existing = await prisma.category.findFirst({
    where: { translations: { some: { locale: "en", slug } } },
  });
  if (existing) return existing;
  return prisma.category.create({
    data: {
      parentId: parentId ?? null,
      position: 0,
      published: true,
      media: [],
      translations: {
        create: [
          { locale: "en", title: labels.en, slug, fullPath: slug },
          { locale: "hy", title: labels.hy, slug, fullPath: slug },
          { locale: "ru", title: labels.ru, slug, fullPath: slug },
        ],
      },
    },
  });
}

async function productSlugExists(slug) {
  const t = await prisma.productTranslation.findFirst({ where: { locale: "en", slug } });
  return !!t;
}

// ─── Seed DB ──────────────────────────────────────────────────────────────────
async function seedProducts(products, imageCache) {
  console.log("\n🌱 Seeding products into DB...");

  const appleBrand = await findOrCreateBrand("apple", "Apple");

  // Build category map
  const catMap = {};
  for (const [slug, labels] of Object.entries(CATEGORY_LABELS)) {
    catMap[slug] = await findOrCreateCategory(slug, labels, null);
  }

  let created = 0;
  let skipped = 0;

  for (const raw of products) {
    const name = cleanName(raw.name);
    const catSlug = detectCategory(name);
    const category = catMap[catSlug];

    let baseSlug = toSlug(name);
    // Ensure unique slug
    let slug = baseSlug;
    let attempt = 0;
    while (await productSlugExists(slug)) {
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    const r2Image = imageCache[raw.image_url] || raw.image_url;
    const mediaArray = (raw.gallery || [raw.image_url])
      .map((u) => ({ url: imageCache[u] || u }))
      .filter((m) => m.url);

    const descHtml = buildDescriptionHtml(raw.description);

    try {
      await prisma.product.create({
        data: {
          brandId: appleBrand.id,
          media: mediaArray,
          published: true,
          featured: false,
          publishedAt: new Date(),
          categoryIds: [category.id],
          primaryCategoryId: category.id,
          attributeIds: [],
          discountPercent: 0,
          categories: { connect: [{ id: category.id }] },
          translations: {
            create: [
              { locale: "en", title: name, slug, descriptionHtml: descHtml },
              { locale: "hy", title: name, slug, descriptionHtml: descHtml },
              { locale: "ru", title: name, slug, descriptionHtml: descHtml },
            ],
          },
          variants: {
            create: {
              price: Math.round((raw.price / AMD_RATE) * 100) / 100,
              stock: 10,
              sku: `mc-${raw.id}`,
              position: 0,
              published: true,
              imageUrl: r2Image,
            },
          },
        },
      });
      created++;
      if (created % 10 === 0) process.stdout.write(`\r  Created: ${created}/${products.length}`);
    } catch (err) {
      if (err.code === "P2002") {
        skipped++;
      } else {
        console.warn(`\n  ⚠ Failed to create "${name}": ${err.message}`);
      }
    }
  }

  console.log(`\n  ✓ Created: ${created}, skipped (duplicate): ${skipped}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const skipImages = process.argv.includes("--skip-images");

  console.log("=== MobileCentre Apple Products Import ===");

  const products = JSON.parse(fs.readFileSync(PRODUCTS_JSON, "utf8"));
  console.log(`Loaded ${products.length} products from JSON`);

  let imageCache = {};

  if (!skipImages) {
    imageCache = await uploadAllImages(products);
  } else {
    console.log("\n⏭ Skipping image upload (--skip-images)");
    if (fs.existsSync(IMAGE_CACHE_FILE)) {
      imageCache = JSON.parse(fs.readFileSync(IMAGE_CACHE_FILE, "utf8"));
      console.log(`  Loaded ${Object.keys(imageCache).length} cached image URLs`);
    }
  }

  await seedProducts(products, imageCache);

  console.log("\n=== Done ===");
}

main()
  .catch((err) => {
    console.error("\n❌ Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
