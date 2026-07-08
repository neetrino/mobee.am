"use strict";

const path = require("path");
const { parentModelKey, slugify, variantDedupeKey } = require("./normalize.cjs");
const { NO_PRICE_IMPORT_ALLOWLIST } = require("./no-price-allowlist.cjs");

function loadEnv(filePath, fs) {
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
  const fs = require("fs");
  loadEnv(path.join(__dirname, "../../../../.env"), fs);
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");

  const { PrismaClient } = require("../../shared/db/generated/client");
  const prisma = new PrismaClient();

  try {
    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        translations: { where: { locale: "en" } },
        variants: true,
      },
    });

    return products.map((p) => {
      const title = p.translations[0]?.title || "";
      return {
        id: p.id,
        title,
        slug: p.translations[0]?.slug || "",
        normalized_model: parentModelKey(title),
        variants: p.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          source: v.source,
          sourcePid: v.sourcePid,
          attributes: v.attributes,
          dedupe_key: variantDedupeKey({
            normalized_model: parentModelKey(title),
            options: v.attributes || {},
            source: v.source,
            source_pid: v.sourcePid,
            sku: v.sku,
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

  for (const p of catalog) {
    if (p.normalized_model === modelKey) return { exists: true, reason: "normalized_model", product: p };
    if (p.slug === slug) return { exists: true, reason: "slug", product: p };
    if (p.title.toLowerCase() === product.product_name.toLowerCase()) return { exists: true, reason: "title", product: p };
  }
  return { exists: false };
}

function checkVariantExists(catalog, variant) {
  const key = variantDedupeKey(variant);
  for (const p of catalog) {
    for (const v of p.variants) {
      if (v.source && variant.source && v.source === variant.source && v.sourcePid && variant.source_pid && String(v.sourcePid) === String(variant.source_pid)) {
        return { exists: true, reason: "source_pid", product: p, variant: v };
      }
      if (v.sku && variant.sku && v.sku === variant.sku) return { exists: true, reason: "sku", product: p, variant: v };
      if (v.dedupe_key === key) return { exists: true, reason: "dedupe_key", product: p, variant: v };
    }
  }
  return { exists: false };
}

function annotateWithDbStatus(products, catalog, { allowNoPrice = false } = {}) {
  return products.map((product) => {
    const parentCheck = checkProductExists(catalog, product);
    const variants = product.variants.map((v) => {
      const vc = checkVariantExists(catalog, v);
      return { ...v, db_status: vc.exists ? "exists" : "new", db_match: vc.exists ? vc : null };
    });
    const allExist = parentCheck.exists && variants.every((v) => v.db_status === "exists");
    const variantReady = (v) => {
      if (v.db_status !== "new" || !v.image_url) return false;
      if (v.price_on_request && allowNoPrice && NO_PRICE_IMPORT_ALLOWLIST.has(product.target_model)) return true;
      return Boolean(v.price);
    };
    const onlyNoPrice =
      allowNoPrice &&
      NO_PRICE_IMPORT_ALLOWLIST.has(product.target_model) &&
      variants.some((v) => v.price_on_request) &&
      variants.filter((v) => v.db_status === "new").every((v) => v.price_on_request || !v.price);
    return {
      ...product,
      db_status: allExist ? "exists" : parentCheck.exists ? "partial" : "new",
      db_match: parentCheck.exists ? parentCheck : null,
      variants,
      import_as_draft: onlyNoPrice,
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
