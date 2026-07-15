"use strict";

const path = require("path");
const { parentModelKey, slugify, variantDedupeKey } = require("./normalize.cjs");

function loadEnv(filePath, fs) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value[0] === '"' && value.at(-1) === '"') || (value[0] === "'" && value.at(-1) === "'")) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function loadExistingCatalog() {
  const fs = require("fs");
  loadEnv(path.join(__dirname, "../../../../.env"), fs);
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");

  const { PrismaClient } = require("../../../../shared/db/generated/client");
  const prisma = new PrismaClient();

  try {
    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        translations: { where: { locale: "en" } },
        variants: true,
        brand: true,
      },
    });

    return products.map((product) => {
      const title = product.translations[0]?.title || "";
      return {
        id: product.id,
        title,
        slug: product.translations[0]?.slug || "",
        brandSlug: product.brand?.slug || "",
        normalized_model: parentModelKey(title),
        variants: product.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          source: variant.source,
          sourcePid: variant.sourcePid,
          attributes: variant.attributes,
          dedupe_key: variantDedupeKey({
            normalized_model: parentModelKey(title),
            options: variant.attributes || {},
            source: variant.source,
            source_pid: variant.sourcePid,
            sku: variant.sku,
          }),
        })),
      };
    });
  } finally {
    await prisma.$disconnect();
  }
}

function checkProductExists(catalog, product) {
  const modelKey = product.normalized_model || parentModelKey(product.product_name);
  const slug = slugify(modelKey);

  for (const row of catalog) {
    if (row.normalized_model === modelKey) {
      return { exists: true, reason: "normalized_model", product: row };
    }
    if (row.slug === slug) return { exists: true, reason: "slug", product: row };
    if (row.title.toLowerCase() === String(product.product_name || "").toLowerCase()) {
      return { exists: true, reason: "title", product: row };
    }
  }
  return { exists: false };
}

function checkVariantExists(catalog, variant) {
  const key = variantDedupeKey(variant);
  for (const product of catalog) {
    for (const row of product.variants) {
      if (
        row.source &&
        variant.source &&
        row.source === variant.source &&
        row.sourcePid &&
        variant.source_pid &&
        String(row.sourcePid) === String(variant.source_pid)
      ) {
        return { exists: true, reason: "source_pid", product, variant: row };
      }
      if (row.sku && variant.sku && row.sku === variant.sku) {
        return { exists: true, reason: "sku", product, variant: row };
      }
      if (row.dedupe_key === key) {
        return { exists: true, reason: "dedupe_key", product, variant: row };
      }
    }
  }
  return { exists: false };
}

function annotateWithDbStatus(products, catalog) {
  return products.map((product) => {
    const parentCheck = checkProductExists(catalog, product);
    const variants = product.variants.map((variant) => {
      const variantCheck = checkVariantExists(catalog, variant);
      return {
        ...variant,
        db_status: variantCheck.exists ? "exists" : "new",
        db_match: variantCheck.exists ? variantCheck : null,
      };
    });

    const allExist = parentCheck.exists && variants.every((variant) => variant.db_status === "exists");
    const variantReady = (variant) =>
      variant.db_status === "new" &&
      Boolean(variant.image_url || (variant.gallery && variant.gallery.length)) &&
      Boolean(variant.price && Number(variant.price) > 0);

    return {
      ...product,
      db_status: allExist ? "exists" : parentCheck.exists ? "partial" : "new",
      db_match: parentCheck.exists ? parentCheck : null,
      variants,
      ready_to_import: !allExist && variants.some(variantReady),
    };
  });
}

module.exports = {
  loadExistingCatalog,
  checkProductExists,
  checkVariantExists,
  annotateWithDbStatus,
};
