#!/usr/bin/env node
"use strict";

const path = require("path");
const fs = require("fs");
const { S3Client } = require("@aws-sdk/client-s3");
const { fetchHtml } = require("../pipelines/apple/http.cjs");
const { buildVariantMediaFromSource } = require("../shared/mobilecentre-variant-media.cjs");

const PRODUCT_ID = "cmraoo0p300562026pp0ldmr9";
const VARIANT_ID = "cmraoo13s005b202657fcuvlg";
const SOURCE_URL = "https://www.yerevanmobile.am/en/apple-iphone-16e.html";
const { cache } = require("../paths.cjs");
const ROOT = path.join(__dirname, "../../..");
const CACHE_FILE = cache.appleSourceImportImageCache;

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
    if ((v[0] === '"' && v.at(-1) === '"') || (v[0] === "'" && v.at(-1) === "'")) {
      v = v.slice(1, -1);
    }
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

function parseYmGallery(html) {
  const marker = '"[data-gallery-role=gallery-placeholder]"';
  const idx = html.indexOf(marker);
  if (idx < 0) return [];
  const dataMatch = html.slice(idx, idx + 120000).match(/"data"\s*:\s*(\[[\s\S]*?\])\s*,\s*"options"/);
  if (!dataMatch) return [];
  const items = JSON.parse(dataMatch[1]);
  const sorted = [...items].sort((a, b) => {
    if (a.isMain && !b.isMain) return -1;
    if (!a.isMain && b.isMain) return 1;
    return Number(a.position || 0) - Number(b.position || 0);
  });
  const seen = new Set();
  const urls = [];
  for (const item of sorted) {
    const url = item.full || item.img || item.thumb;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

async function main() {
  loadEnv();
  const { text } = await fetchHtml(SOURCE_URL);
  const gallery = parseYmGallery(text);
  if (!gallery.length) throw new Error("No gallery images found on source page");

  const r2 = createR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrlBase = process.env.R2_PUBLIC_URL || "";
  const imageCache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) : {};

  const { imageUrl, media } = await buildVariantMediaFromSource({
    r2,
    bucket,
    publicUrlBase,
    sourcePid: "yerevanmobile-apple-iphone-16e-0",
    variant: {
      image_url: gallery[0],
      gallery,
      product_url: SOURCE_URL,
    },
    imageCache,
    skipR2: !r2,
    alt: "Apple iPhone 16e",
  });

  fs.writeFileSync(CACHE_FILE, JSON.stringify(imageCache, null, 2));

  const { PrismaClient } = require("../../../shared/db/generated/client");
  const prisma = new PrismaClient();
  try {
    await prisma.product.update({
      where: { id: PRODUCT_ID },
      data: { media },
    });
    await prisma.productVariant.update({
      where: { id: VARIANT_ID },
      data: { imageUrl, media },
    });

    console.log(JSON.stringify({
      productId: PRODUCT_ID,
      variantId: VARIANT_ID,
      gallerySourceCount: gallery.length,
      mediaCount: media.length,
      imageUrl,
      mediaUrls: media.map((m) => m.url),
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
