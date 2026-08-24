"use strict";

const path = require("path");
const fs = require("fs");
const { variantDedupeKey, slugify, normalize } = require("./normalize.cjs");

const ROOT = path.join(__dirname, "../../../..");

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

async function loadExistingCatalog() {
  loadEnv(path.join(ROOT, ".env"));
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
        categories: { include: { translations: { where: { locale: "en" } } } },
      },
    });

    return products.map((product) => {
      const title = product.translations[0]?.title || "";
      return {
        id: product.id,
        title,
        slug: product.translations[0]?.slug || "",
        brandSlug: product.brand?.slug || "",
        normalized_model: normalize(title),
        normalized_slug: slugify(title),
        categorySlugs: product.categories.flatMap((category) =>
          category.translations.map((translation) => translation.slug),
        ),
        variants: product.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          source: variant.source,
          sourcePid: variant.sourcePid,
          sourceUrl: variant.sourceUrl,
          price: variant.price,
          stock: variant.stock,
          priceOnRequest: variant.priceOnRequest,
          attributes: variant.attributes,
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

function checkProductExists(catalog, product) {
  const modelKey = normalize(product.model || product.product_name);
  const modelSlug = slugify(product.model || product.product_name);

  for (const entry of catalog) {
    if (entry.normalized_model === modelKey) {
      return { exists: true, reason: "normalized_model", product: entry };
    }
    if (entry.slug === modelSlug || entry.normalized_slug === modelSlug) {
      return { exists: true, reason: "slug", product: entry };
    }
    if (normalize(entry.title) === modelKey) {
      return { exists: true, reason: "title", product: entry };
    }
  }
  return { exists: false };
}

function checkVariantExists(catalog, variant) {
  const key = variantDedupeKey(variant);
  const sourcePid = String(variant.source_pid || variant.sourcePid || "");

  for (const product of catalog) {
    for (const dbVariant of product.variants) {
      if (
        sourcePid &&
        String(dbVariant.sourcePid || "") === sourcePid &&
        (dbVariant.source === variant.source || dbVariant.source === "mobilecentre" || dbVariant.source === "yerevanmobile")
      ) {
        return { exists: true, reason: "source_pid", product, variant: dbVariant };
      }
      if (dbVariant.dedupe_key === key) {
        return { exists: true, reason: "dedupe_key", product, variant: dbVariant };
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
    const hasNewVariants = variants.some((variant) => variant.db_status === "new");

    return {
      ...product,
      db_status: allExist ? "exists" : parentCheck.exists ? "partial" : "new",
      db_match: parentCheck.exists ? parentCheck : null,
      variants,
      ready_to_import: !allExist && hasNewVariants && product.validation_ok,
    };
  });
}

module.exports = {
  loadExistingCatalog,
  checkProductExists,
  checkVariantExists,
  annotateWithDbStatus,
};
