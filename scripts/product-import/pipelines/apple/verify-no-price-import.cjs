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
const { hasDisplayPrice, assertVariantPurchasable } = require("../../shared/variant-price-display.cjs");

const IMPORT_IDS = ["cmraqdxj90005114qogl997ug", "cmraqe1h00018114q2b8toosm"];

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = { products: [], checks: {}, duplicates: {} };

    for (const id of IMPORT_IDS) {
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          translations: { where: { locale: "en" }, select: { title: true, slug: true } },
          variants: {
            select: {
              id: true,
              sku: true,
              price: true,
              priceOnRequest: true,
              stock: true,
              published: true,
              source: true,
              sourceUrl: true,
              sourcePid: true,
              imageUrl: true,
              media: true,
            },
          },
        },
      });

      if (!product) {
        result.products.push({ id, missing: true });
        continue;
      }

      const variants = product.variants;
      const mediaHasR2 = variants.filter((v) => {
        const blob = JSON.stringify({ imageUrl: v.imageUrl, media: v.media });
        return /r2\.cloudflarestorage|pub-|\.r2\.dev/i.test(blob);
      }).length;

      result.products.push({
        id: product.id,
        title: product.translations[0]?.title ?? null,
        slug: product.translations[0]?.slug ?? null,
        published: product.published,
        variantCount: variants.length,
        allPriceOnRequest: variants.every((v) => v.priceOnRequest === true),
        allPriceZero: variants.every((v) => v.price === 0),
        allVariantsUnpublished: variants.every((v) => v.published === false),
        allStockZero: variants.every((v) => v.stock === 0),
        withSourceUrl: variants.filter((v) => Boolean(v.sourceUrl)).length,
        withImage: variants.filter((v) => Boolean(v.imageUrl)).length,
        r2MediaCount: mediaHasR2,
        noDisplayPrice: variants.every((v) => !hasDisplayPrice(v)),
        cartBlocked: variants.every((v) => {
          try {
            assertVariantPurchasable(v);
            return false;
          } catch {
            return true;
          }
        }),
        source: variants[0]?.source ?? null,
      });
    }

    const since = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const imacNew = await prisma.product.count({
      where: {
        createdAt: { gte: since },
        translations: { some: { title: { contains: "iMac", mode: "insensitive" } } },
      },
    });
    const airpodsNew = await prisma.product.count({
      where: {
        createdAt: { gte: since },
        translations: { some: { title: { contains: "AirPods Max 2", mode: "insensitive" } } },
      },
    });

    result.duplicates = {
      imacCreatedLast2h: imacNew,
      airpodsMax2CreatedLast2h: airpodsNew,
    };

    result.checks = {
      bothExist: result.products.length === 2 && result.products.every((p) => !p.missing),
      allDraft: result.products.every((p) => p.published === false),
      allVariantsPriceOnRequest: result.products.every((p) => p.allPriceOnRequest),
      allVariantsPriceZero: result.products.every((p) => p.allPriceZero),
      allVariantsUnpublished: result.products.every((p) => p.allVariantsUnpublished),
      noDisplayPrice: result.products.every((p) => p.noDisplayPrice),
      cartBlocked: result.products.every((p) => p.cartBlocked),
      imagesPresent: result.products.every((p) => p.withImage === p.variantCount),
      sourceUrlsPresent: result.products.every((p) => p.withSourceUrl === p.variantCount),
      noNewImacDuplicates: imacNew === 0,
      noNewAirPodsDuplicates: airpodsNew === 0,
    };

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
