"use strict";

const path = require("path");
const fs = require("fs");
const { slugify, variantDedupeKey } = require("../normalize.cjs");

const ROOT = path.join(__dirname, "../../../../../");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
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

function mediaCount(media) {
  if (!media) return 0;
  if (Array.isArray(media)) return media.length;
  return 0;
}

function isGenericVariant(variant) {
  const attrs = variant.attributes || {};
  const keys = Object.keys(attrs).filter((key) => attrs[key]);
  return keys.length === 0;
}

async function loadSamsungDbCatalog() {
  loadEnv(path.join(ROOT, ".env"));
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");

  const { PrismaClient } = require("../../../../../shared/db/generated/client");
  const prisma = new PrismaClient();

  try {
    const products = await prisma.product.findMany({
      where: {
        deletedAt: null,
        brand: { slug: "samsung" },
        categories: { some: { translations: { some: { slug: "phones", locale: "en" } } } },
      },
      include: {
        translations: { where: { locale: "en" } },
        variants: { orderBy: { position: "asc" } },
        brand: true,
        categories: { include: { translations: { where: { locale: "en" } } } },
      },
    });

    const variantIds = products.flatMap((product) => product.variants.map((variant) => variant.id));
    const cartCounts = variantIds.length
      ? await prisma.cartItem.groupBy({
          by: ["variantId"],
          where: { variantId: { in: variantIds } },
          _count: { variantId: true },
        })
      : [];
    const orderCounts = variantIds.length
      ? await prisma.orderItem.groupBy({
          by: ["variantId"],
          where: { variantId: { in: variantIds } },
          _count: { variantId: true },
        })
      : [];

    const cartMap = new Map(cartCounts.map((row) => [row.variantId, row._count.variantId]));
    const orderMap = new Map(orderCounts.map((row) => [row.variantId, row._count.variantId]));

    return products.map((product) => {
      const translation = product.translations[0];
      const title = translation?.title || "";
      const descriptionHtml = translation?.descriptionHtml || null;

      return {
        id: product.id,
        title,
        slug: translation?.slug || "",
        brandSlug: product.brand?.slug || "",
        published: product.published,
        normalized_model: title.toLowerCase(),
        normalized_slug: slugify(title),
        descriptionHtml,
        descriptionHtml_length: descriptionHtml ? descriptionHtml.length : 0,
        media_count: mediaCount(product.media),
        media: product.media,
        variants: product.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          source: variant.source,
          sourcePid: variant.sourcePid,
          sourceUrl: variant.sourceUrl,
          price: variant.price,
          stock: variant.stock,
          priceOnRequest: variant.priceOnRequest,
          published: variant.published,
          attributes: variant.attributes,
          imageUrl: variant.imageUrl,
          media_count: mediaCount(variant.media),
          media: variant.media,
          cart_refs: cartMap.get(variant.id) || 0,
          order_refs: orderMap.get(variant.id) || 0,
          has_refs: (cartMap.get(variant.id) || 0) + (orderMap.get(variant.id) || 0) > 0,
          generic: isGenericVariant(variant),
          dedupe_key: variantDedupeKey({
            model: title,
            options: variant.attributes || {},
            source_pid: variant.sourcePid,
          }),
        })),
      };
    });
  } finally {
    await prisma.$disconnect();
  }
}

function findDbProduct(catalog, model) {
  const key = slugify(model);
  return (
    catalog.find((entry) => entry.slug === key) ||
    catalog.find((entry) => slugify(entry.title) === key) ||
    null
  );
}

module.exports = {
  loadSamsungDbCatalog,
  findDbProduct,
  mediaCount,
  isGenericVariant,
};
