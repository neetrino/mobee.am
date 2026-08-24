#!/usr/bin/env node
"use strict";

/**
 * Read-only Samsung import dry-run DB lookup.
 * Usage: node scripts/product-import/pipelines/samsung/_load-db-catalog.cjs
 */

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
    if ((v[0] === '"' && v.at(-1) === '"') || (v[0] === "'" && v.at(-1) === "'")) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, "-")
    .replace(/[_|[\],()/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function variantKey(model, options, sourcePid) {
  const parts = [
    normalize(model),
    normalize(options?.storage),
    normalize(options?.ram || options?.memory),
    normalize(options?.color),
    normalize(options?.connectivity),
    normalize(options?.source_sku),
    String(sourcePid || ""),
  ];
  return parts.filter(Boolean).join("|");
}

async function main() {
  loadEnv(path.join(__dirname, "../../../../.env"));
  if (!process.env.DATABASE_URL) {
    console.error(JSON.stringify({ error: "DATABASE_URL missing" }));
    process.exit(1);
  }

  const { PrismaClient } = require("../../shared/db/generated/client");
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

    const catalog = products.map((p) => {
      const title = p.translations[0]?.title || "";
      const normalizedModel = normalize(title);
      return {
        id: p.id,
        title,
        slug: p.translations[0]?.slug || "",
        brandSlug: p.brand?.slug || "",
        normalized_model: normalizedModel,
        normalized_slug: slugify(title),
        variants: p.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          source: v.source,
          sourcePid: v.sourcePid,
          attributes: v.attributes,
          dedupe_key: variantKey(title, v.attributes || {}, v.sourcePid),
        })),
      };
    });

    process.stdout.write(JSON.stringify({ products: catalog }, null, 0));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error.message }));
  process.exit(1);
});
