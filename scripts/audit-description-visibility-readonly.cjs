#!/usr/bin/env node
/**
 * Read-only audit: MobileCentre product descriptions in JSON and DB.
 */
"use strict";

const fs = require("fs");
const path = require("path");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v[0] === '"' && v.at(-1) === '"') || (v[0] === "'" && v.at(-1) === "'"))
      v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

const ROOT = path.join(__dirname, "..");
loadEnv(path.join(ROOT, ".env"));

const FLAT = path.join(ROOT, "data/product-import/apple/mobilecentre_apple_flat_variants.json");
const VARIABLE = path.join(ROOT, "data/product-import/apple/mobilecentre_apple_variable_products.json");

function sampleByCategory(flat, categories) {
  const out = {};
  for (const cat of categories) {
    const hit = flat.find((v) => v.category === cat);
    if (hit) out[cat] = hit;
  }
  return out;
}

function describeVariant(v) {
  const desc = v.description ?? "";
  const has = Boolean(desc && String(desc).trim());
  return {
    source_pid: v.source_pid,
    name: v.name,
    model: v.model,
    product_url: v.product_url,
    hasDescription: has,
    descriptionLength: has ? String(desc).length : 0,
    preview: has ? String(desc).slice(0, 200) : "",
  };
}

async function auditJson() {
  const flat = JSON.parse(fs.readFileSync(FLAT, "utf8"));
  const variable = JSON.parse(fs.readFileSync(VARIABLE, "utf8"));

  const flatWithDesc = flat.filter((v) => v.description && String(v.description).trim());
  const parentsWithDesc = variable.filter((g) => g.description && String(g.description).trim());

  const samples = sampleByCategory(flat, ["iPhone", "MacBook", "iPad", "Apple Watch", "AirPods"]);

  console.log("=== JSON AUDIT ===");
  console.log("flat variants:", flat.length);
  console.log("flat with non-empty description:", flatWithDesc.length);
  console.log("variable parents:", variable.length);
  console.log("variable parents with description field:", parentsWithDesc.length);
  console.log("\n=== JSON SAMPLES ===");
  for (const [cat, v] of Object.entries(samples)) {
    console.log(`\n[${cat}]`);
    console.log(JSON.stringify(describeVariant(v), null, 2));
  }

  const parentSample = variable.find((g) => g.model && g.model.includes("iPhone 17"));
  if (parentSample) {
    console.log("\n[variable parent iPhone sample keys]", Object.keys(parentSample).join(", "));
    console.log("parent.description:", parentSample.description ?? "(missing)");
  }
}

async function auditDb() {
  const { PrismaClient } = require("../shared/db/generated/client");
  const prisma = new PrismaClient();

  try {
    const products = await prisma.product.findMany({
      where: {
        deletedAt: null,
        variants: { some: { source: "mobilecentre" } },
      },
      select: {
        id: true,
        translations: {
          select: { locale: true, title: true, slug: true, descriptionHtml: true },
        },
        variants: {
          where: { source: "mobilecentre" },
          select: { sourcePid: true },
          take: 1,
        },
      },
    });

    let productsWithDescription = 0;
    let hy = 0;
    let ru = 0;
    let en = 0;
    const examplesWith = [];
    const examplesWithout = [];

    for (const product of products) {
      const hasAny = product.translations.some(
        (t) => t.descriptionHtml && t.descriptionHtml.trim().length > 0
      );
      if (hasAny) {
        productsWithDescription++;
        if (examplesWith.length < 10) {
          examplesWith.push({
            id: product.id,
            slug: product.translations.find((t) => t.locale === "en")?.slug,
            sourcePid: product.variants[0]?.sourcePid,
            lengths: product.translations.map((t) => ({
              locale: t.locale,
              len: (t.descriptionHtml || "").length,
            })),
            preview: (product.translations.find((t) => t.locale === "hy")?.descriptionHtml || "").slice(0, 120),
          });
        }
      } else if (examplesWithout.length < 10) {
        examplesWithout.push({
          id: product.id,
          title: product.translations[0]?.title,
          sourcePid: product.variants[0]?.sourcePid,
        });
      }

      for (const t of product.translations) {
        if (t.descriptionHtml && t.descriptionHtml.trim()) {
          if (t.locale === "hy") hy++;
          if (t.locale === "ru") ru++;
          if (t.locale === "en") en++;
        }
      }
    }

    console.log("\n=== DB AUDIT (mobilecentre products) ===");
    console.log(
      JSON.stringify(
        {
          totalMobileCentreProducts: products.length,
          productsWithDescription,
          productTranslationsExpected: products.length * 3,
          translationsWithDescriptionHy: hy,
          translationsWithDescriptionRu: ru,
          translationsWithDescriptionEn: en,
          examplesWithDescription: examplesWith,
          examplesWithoutDescription: examplesWithout,
        },
        null,
        2
      )
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await auditJson();
  await auditDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
