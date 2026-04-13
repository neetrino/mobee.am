#!/usr/bin/env node

/**
 * Clear product photos (media + variant imageUrl) so the site shows the placeholder icon.
 * Usage:
 *   node scripts/clear-product-photos.js <slug>     — clear one product by slug (locale en)
 *   node scripts/clear-product-photos.js --all      — clear media for ALL products (use with care)
 *
 * Requires: run from project root, .env with DATABASE_URL and DIRECT_URL.
 * Prisma client: pnpm run db:generate first if needed.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
const fs = require("fs");

// Load .env from project root
const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  content.split("\n").forEach((line) => {
    const t = line.trim();
    if (t && !t.startsWith("#")) {
      const eq = t.indexOf("=");
      if (eq > 0) {
        const key = t.slice(0, eq).trim();
        let val = t.slice(eq + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        process.env[key] = val;
      }
    }
  });
}

async function main() {
  const { db } = require("@white-shop/db");

  const arg = process.argv[2];
  if (!arg) {
    console.log("Usage: node scripts/clear-product-photos.js <slug>  |  node scripts/clear-product-photos.js --all");
    process.exit(1);
  }

  if (arg === "--all") {
    const result = await db.product.updateMany({ data: { media: [] } });
    await db.productVariant.updateMany({ data: { imageUrl: null } });
    console.log("Cleared media for all products (" + result.count + ") and imageUrl for all variants.");
    await db.$disconnect();
    return;
  }

  const slug = arg;
  const translation = await db.productTranslation.findFirst({
    where: { slug, locale: "en" },
    select: { productId: true },
  });
  if (!translation) {
    console.error("Product with slug '" + slug + "' (en) not found.");
    process.exit(1);
  }

  const productId = translation.productId;
  await db.product.update({
    where: { id: productId },
    data: { media: [] },
  });
  await db.productVariant.updateMany({
    where: { productId },
    data: { imageUrl: null },
  });
  console.log("Cleared photos for product:", slug, "(id:", productId + ")");
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
