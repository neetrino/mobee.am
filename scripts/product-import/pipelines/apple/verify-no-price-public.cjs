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

const { PrismaClient } = require("../../shared/db/generated/client");
const {
  hasDisplayPrice,
  assertVariantPurchasable,
  assertCartLinePurchasable,
} = require("../../shared/variant-price-display.cjs");

const PRODUCT_IDS = ["cmraqdxj90005114qogl997ug", "cmraqe1h00018114q2b8toosm"];

async function main() {
  const prisma = new PrismaClient();
  const out = { db: [], guards: [], duplicates: 0 };

  try {
    for (const productId of PRODUCT_IDS) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          translations: { where: { locale: "en" }, select: { title: true, slug: true } },
          variants: {
            where: { published: true },
            select: {
              id: true,
              price: true,
              priceOnRequest: true,
              stock: true,
              published: true,
              imageUrl: true,
            },
          },
        },
      });

      if (!product) {
        out.db.push({ productId, missing: true });
        continue;
      }

      const variant = product.variants[0];
      let cartErr = null;
      try {
        assertVariantPurchasable(variant);
      } catch (e) {
        cartErr = e;
      }
      let checkoutErr = null;
      try {
        assertCartLinePurchasable({ priceSnapshot: 0, variant });
      } catch (e) {
        checkoutErr = e;
      }

      out.db.push({
        productId,
        title: product.translations[0]?.title,
        slug: product.translations[0]?.slug,
        published: product.published,
        variantCount: product.variants.length,
        allStockTen: product.variants.every((v) => v.stock === 10),
        allPriceOnRequest: product.variants.every((v) => v.priceOnRequest === true),
        allPriceZero: product.variants.every((v) => v.price === 0),
        listingHasPrice: product.variants.some((v) => hasDisplayPrice(v)),
        listingInStock: product.variants.some((v) => hasDisplayPrice(v) && v.stock > 0),
        showsZeroPrice: product.variants.some((v) => hasDisplayPrice(v) && v.price === 0),
        imagesOk: product.variants.every((v) => Boolean(v.imageUrl)),
      });

      out.guards.push({
        productId,
        variantId: variant?.id ?? null,
        addToCartBlocked: Boolean(cartErr),
        addToCartTitle: cartErr?.title ?? null,
        checkoutBlocked: Boolean(checkoutErr),
        checkoutTitle: checkoutErr?.title ?? null,
      });
    }

    out.duplicates = await prisma.product.count({
      where: {
        id: { notIn: PRODUCT_IDS },
        translations: {
          some: { title: { in: ["Studio Display 2026", "Studio Display XDR"] } },
        },
      },
    });
  } finally {
    await prisma.$disconnect();
  }

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
