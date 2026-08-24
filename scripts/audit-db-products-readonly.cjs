#!/usr/bin/env node
/**
 * Read-only audit of current product catalog in DB.
 * No mutations. Safe to run anytime.
 */
"use strict";

const path = require("path");
const fs = require("fs");

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

loadEnv(path.join(__dirname, "../.env"));

const { PrismaClient } = require("../shared/db/generated/client");
const prisma = new PrismaClient();

async function main() {
  const envKeys = [
    "DATABASE_URL",
    "DIRECT_URL",
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "R2_PUBLIC_URL",
  ];

  console.log("=== ENV ===");
  for (const key of envKeys) {
    console.log(`${key}: ${process.env[key] ? "OK" : "MISSING"}`);
  }

  const dbUrl = process.env.DATABASE_URL || "";
  const dbHost = dbUrl.match(/@([^/?]+)/)?.[1] || "(unknown)";
  console.log(`DB host: ${dbHost}`);

  console.log("\n=== COUNTS ===");
  const counts = {
    products: await prisma.product.count(),
    productsPublished: await prisma.product.count({ where: { published: true } }),
    productsSoftDeleted: await prisma.product.count({ where: { deletedAt: { not: null } } }),
    variants: await prisma.productVariant.count(),
    variantsPublished: await prisma.productVariant.count({ where: { published: true } }),
    variantOptions: await prisma.productVariantOption.count(),
    translations: await prisma.productTranslation.count(),
    productAttributes: await prisma.productAttribute.count(),
    labels: await prisma.productLabel.count(),
    cartItems: await prisma.cartItem.count(),
    orderItems: await prisma.orderItem.count(),
    orderItemsWithVariant: await prisma.orderItem.count({ where: { variantId: { not: null } } }),
    reviews: await prisma.productReview.count(),
    brands: await prisma.brand.count(),
    categories: await prisma.category.count(),
    attributes: await prisma.attribute.count(),
    attributeValues: await prisma.attributeValue.count(),
  };
  console.log(JSON.stringify(counts, null, 2));

  console.log("\n=== MOBILECENTRE SOURCE VARIANTS ===");
  const mcCount = await prisma.productVariant.count({ where: { source: "mobilecentre" } });
  console.log(`mobilecentre variants total: ${mcCount}`);

  const orphanCount = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM product_variants v
    LEFT JOIN products p ON p.id = v."productId"
    WHERE p.id IS NULL
  `;
  console.log(`orphan variants (no parent product): ${orphanCount[0]?.count ?? 0}`);

  const mcSample = await prisma.$queryRaw`
    SELECT v.id, v."sourcePid", v.sku, v.price, t.title, t.slug
    FROM product_variants v
    JOIN products p ON p.id = v."productId"
    LEFT JOIN product_translations t ON t."productId" = p.id AND t.locale = 'en'
    WHERE v.source = 'mobilecentre'
    ORDER BY v."createdAt" DESC
    LIMIT 10
  `;
  console.log(JSON.stringify(mcSample, null, 2));

  console.log("\n=== BRANDS (top) ===");
  const brands = await prisma.brand.findMany({
    include: { translations: { where: { locale: "en" } }, _count: { select: { products: true } } },
    orderBy: { products: { _count: "desc" } },
    take: 10,
  });
  for (const b of brands) {
    console.log(`- ${b.slug}: ${b._count.products} products (${b.translations[0]?.name || "?"})`);
  }

  console.log("\n=== SAMPLE PRODUCT TITLES (en, latest 15) ===");
  const latest = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    take: 15,
    include: { translations: { where: { locale: "en" } }, variants: { select: { id: true, source: true, sourcePid: true } } },
  });
  for (const p of latest) {
    const title = p.translations[0]?.title || "?";
    const mc = p.variants.filter((v) => v.source === "mobilecentre").length;
    console.log(`- ${title} | variants=${p.variants.length} mc=${mc}`);
  }

  console.log("\n=== CART ITEMS BLOCKING DELETE? ===");
  const cartBlocking = await prisma.cartItem.count();
  console.log(`cart_items referencing variants: ${cartBlocking}`);

  console.log("\n=== ORDER ITEMS WITH VARIANT FK ===");
  console.log(`order_items with variantId set: ${counts.orderItemsWithVariant}`);
}

main()
  .catch((e) => {
    console.error("AUDIT ERROR:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
