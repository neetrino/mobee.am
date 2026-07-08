#!/usr/bin/env node
"use strict";

const path = require("path");
const fs = require("fs");

function loadEnv() {
  const envPath = path.join(__dirname, "../../../../.env");
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

loadEnv();

const PRODUCT_IDS = ["cmraqdxj90005114qogl997ug", "cmraqe1h00018114q2b8toosm"];
const TARGET_STOCK = 10;

async function main() {
  const { PrismaClient } = require("../../shared/db/generated/client");
  const prisma = new PrismaClient();

  try {
    const now = new Date();
    const summary = { products: [], variantUpdates: 0 };

    for (const productId of PRODUCT_IDS) {
      const before = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          translations: { where: { locale: "en" }, select: { title: true, slug: true } },
          variants: { select: { id: true, published: true, stock: true, price: true, priceOnRequest: true } },
        },
      });

      if (!before) {
        summary.products.push({ productId, error: "not_found" });
        continue;
      }

      await prisma.product.update({
        where: { id: productId },
        data: {
          published: true,
          publishedAt: before.publishedAt ?? now,
        },
      });

      const variantResult = await prisma.productVariant.updateMany({
        where: { productId },
        data: {
          published: true,
          stock: TARGET_STOCK,
          price: 0,
          priceOnRequest: true,
        },
      });

      summary.variantUpdates += variantResult.count;

      const after = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          translations: { where: { locale: "en" }, select: { title: true, slug: true } },
          variants: {
            select: {
              id: true,
              published: true,
              stock: true,
              price: true,
              priceOnRequest: true,
              imageUrl: true,
            },
          },
        },
      });

      summary.products.push({
        productId,
        title: after?.translations[0]?.title ?? null,
        slug: after?.translations[0]?.slug ?? null,
        published: after?.published ?? false,
        variantCount: after?.variants.length ?? 0,
        allVariantsPublished: after?.variants.every((v) => v.published === true) ?? false,
        allStockTen: after?.variants.every((v) => v.stock === TARGET_STOCK) ?? false,
        allPriceOnRequest: after?.variants.every((v) => v.priceOnRequest === true) ?? false,
        allPriceZero: after?.variants.every((v) => v.price === 0) ?? false,
      });
    }

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
