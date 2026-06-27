#!/usr/bin/env node
/**
 * scripts/reclassify-products-to-canonical-categories.cjs
 *
 * Moves every product into one of 8 canonical shop categories and unpublishes
 * all other categories (iphone, ipad, mac, airpods, etc.). Products are never deleted.
 *
 * Canonical EN slugs:
 *   phones, tablets, computers, watches, headphones, accessories, tvs, household-appliances
 *
 * Usage:
 *   node scripts/reclassify-products-to-canonical-categories.cjs --dry-run
 *   node scripts/reclassify-products-to-canonical-categories.cjs --confirm
 */

"use strict";

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

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

loadEnv(path.join(__dirname, "../.env"));

const { PrismaClient } = require("../shared/db/generated/client");
const prisma = new PrismaClient();

const LOCALES = ["en", "hy", "ru"];

const CANONICAL_CATEGORIES = [
  {
    enSlug: "phones",
    homeStripPosition: 1,
    position: 1,
    labels: {
      en: "Phones",
      hy: "Հեռախոս",
      ru: "Телефоны",
    },
    hySlug: "herakhos",
    ruSlug: "telefony",
  },
  {
    enSlug: "tablets",
    homeStripPosition: 2,
    position: 2,
    labels: {
      en: "Tablets",
      hy: "Պլանշետ",
      ru: "Планшеты",
    },
    hySlug: "planshet",
    ruSlug: "planshety",
  },
  {
    enSlug: "computers",
    homeStripPosition: 3,
    position: 3,
    labels: {
      en: "Computers",
      hy: "Համակարգիչ",
      ru: "Компьютеры",
    },
    hySlug: "hamakargich",
    ruSlug: "kompyutery",
  },
  {
    enSlug: "watches",
    homeStripPosition: 4,
    position: 4,
    labels: {
      en: "Watches",
      hy: "Ժամացույց",
      ru: "Часы",
    },
    hySlug: "zhamatsuyts",
    ruSlug: "chasy",
  },
  {
    enSlug: "headphones",
    homeStripPosition: 5,
    position: 5,
    labels: {
      en: "Headphones",
      hy: "Ականջակալ",
      ru: "Наушники",
    },
    hySlug: "akanjakal",
    ruSlug: "naushniki",
  },
  {
    enSlug: "accessories",
    homeStripPosition: 6,
    position: 6,
    labels: {
      en: "Accessories",
      hy: "Աքսեսուար",
      ru: "Аксессуары",
    },
    hySlug: "aksesuarner",
    ruSlug: "aksessuary",
  },
  {
    enSlug: "tvs",
    homeStripPosition: 7,
    position: 7,
    labels: {
      en: "TVs",
      hy: "Հեռուստացույց",
      ru: "Телевизоры",
    },
    hySlug: "herustatsuyts",
    ruSlug: "televizory",
  },
  {
    enSlug: "household-appliances",
    homeStripPosition: 8,
    position: 8,
    labels: {
      en: "Household Appliances",
      hy: "Կենցաղային տեխնիկա",
      ru: "Бытовая техника",
    },
    hySlug: "kencaxayin-texnika",
    ruSlug: "bytovaya-tekhnika",
  },
];

const CANONICAL_EN_SLUGS = new Set(CANONICAL_CATEGORIES.map((c) => c.enSlug));

/** Source category EN (or legacy) slug → canonical EN slug */
const SLUG_TO_CANONICAL = {
  iphone: "phones",
  smartphones: "phones",
  "smart-phone": "phones",
  phone: "phones",
  herakhos: "phones",
  telefony: "phones",

  ipad: "tablets",
  tablet: "tablets",
  planshet: "tablets",
  planshety: "tablets",

  mac: "computers",
  imac: "computers",
  macbook: "computers",
  laptop: "computers",
  laptops: "computers",
  pc: "computers",
  pcs: "computers",
  hamakargich: "computers",
  kompyutery: "computers",

  "apple-watch": "watches",
  applewatch: "watches",
  smartwatch: "watches",
  smartwatches: "watches",
  watch: "watches",
  zhamatsuyts: "watches",
  chasy: "watches",

  airpods: "headphones",
  airpod: "headphones",
  earbuds: "headphones",
  earphones: "headphones",
  "headphones-earbuds": "headphones",
  headset: "headphones",
  headsets: "headphones",
  akanjakal: "headphones",
  naushniki: "headphones",

  airtag: "accessories",
  "apple-tv": "tvs",
  "smart-home-devices": "accessories",
  "gaming-devices": "accessories",
  "cameras-drones": "accessories",
  cameras: "accessories",
  drones: "accessories",
  electronics: "accessories",

  tvs: "tvs",
  tv: "tvs",
  television: "tvs",
  herustatsuyts: "tvs",
  televizory: "tvs",

  "household-appliances": "household-appliances",
  household: "household-appliances",
  "home-appliances": "household-appliances",
  "kencaxayin-texnika": "household-appliances",
  kencaxayin: "household-appliances",
  "bytovaya-tekhnika": "household-appliances",
};

function translationId(categoryId, locale) {
  return crypto.createHash("md5").update(`${categoryId}:${locale}`).digest("hex").slice(0, 25);
}

function resolveCanonicalFromTitle(title) {
  const n = (title || "").toLowerCase();
  if (n.includes("iphone") || n.includes("smartphone")) return "phones";
  if (n.includes("ipad") || n.includes("tablet")) return "tablets";
  if (
    n.includes("macbook") ||
    n.includes("mac mini") ||
    n.includes("imac") ||
    n.includes("mac pro") ||
    n.includes("mac studio") ||
    n.includes("laptop") ||
    n.includes("notebook")
  ) {
    return "computers";
  }
  if (n.includes("airpods") || n.includes("airpod") || n.includes("earbud")) return "headphones";
  if (n.includes("apple watch") || n.includes("applewatch") || n.includes("smartwatch"))
    return "watches";
  if (n.includes("apple tv") || /\btv\b/.test(n) || n.includes("television")) return "tvs";
  if (
    n.includes("washing") ||
    n.includes("refrigerator") ||
    n.includes("dishwasher") ||
    n.includes("household") ||
    n.includes("бытов") ||
    n.includes("կենցաղ")
  ) {
    return "household-appliances";
  }
  if (n.includes("airtag")) return "accessories";
  return "accessories";
}

function resolveCanonicalSlug(sourceSlugs, title) {
  for (const slug of sourceSlugs) {
    const normalized = (slug || "").toLowerCase().trim();
    if (!normalized) continue;
    if (CANONICAL_EN_SLUGS.has(normalized)) return normalized;
    if (SLUG_TO_CANONICAL[normalized]) return SLUG_TO_CANONICAL[normalized];
  }
  return resolveCanonicalFromTitle(title);
}

async function findOrCreateCanonicalCategory(def, slugToId) {
  if (slugToId[def.enSlug]) {
    return slugToId[def.enSlug];
  }

  const existing = await prisma.category.findFirst({
    where: {
      deletedAt: null,
      translations: { some: { locale: "en", slug: def.enSlug } },
    },
    include: { translations: true },
  });

  if (existing) {
    slugToId[def.enSlug] = existing.id;
    return existing.id;
  }

  const created = await prisma.category.create({
    data: {
      position: def.position,
      homeStripPosition: def.homeStripPosition,
      published: true,
      media: [],
      translations: {
        create: [
          {
            id: translationId("new:" + def.enSlug, "en"),
            locale: "en",
            title: def.labels.en,
            slug: def.enSlug,
            fullPath: def.enSlug,
          },
          {
            id: translationId("new:" + def.enSlug, "hy"),
            locale: "hy",
            title: def.labels.hy,
            slug: def.hySlug,
            fullPath: def.hySlug,
          },
          {
            id: translationId("new:" + def.enSlug, "ru"),
            locale: "ru",
            title: def.labels.ru,
            slug: def.ruSlug,
            fullPath: def.ruSlug,
          },
        ],
      },
    },
  });

  slugToId[def.enSlug] = created.id;
  return created.id;
}

async function upsertCanonicalCategoryTranslations(categoryId, def) {
  const localeSlugs = {
    en: def.enSlug,
    hy: def.hySlug,
    ru: def.ruSlug,
  };

  for (const locale of LOCALES) {
    const slug = localeSlugs[locale];
    const title = def.labels[locale];
    const existing = await prisma.categoryTranslation.findUnique({
      where: { categoryId_locale: { categoryId, locale } },
    });

    if (existing) {
      await prisma.categoryTranslation.update({
        where: { id: existing.id },
        data: { title, slug, fullPath: slug },
      });
    } else {
      await prisma.categoryTranslation.create({
        data: {
          id: translationId(categoryId, locale),
          categoryId,
          locale,
          title,
          slug,
          fullPath: slug,
        },
      });
    }
  }

  await prisma.category.update({
    where: { id: categoryId },
    data: {
      position: def.position,
      homeStripPosition: def.homeStripPosition,
      published: true,
      parentId: null,
      deletedAt: null,
    },
  });
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const confirm = process.argv.includes("--confirm");

  if (!dryRun && !confirm) {
    console.error("Pass --dry-run or --confirm");
    process.exit(1);
  }

  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);

  const allCategories = await prisma.category.findMany({
    where: { deletedAt: null },
    include: { translations: true },
  });

  const slugToId = {};
  const idToEnSlug = {};

  for (const cat of allCategories) {
    for (const tr of cat.translations) {
      if (tr.locale === "en" && tr.slug) {
        slugToId[tr.slug] = cat.id;
        idToEnSlug[cat.id] = tr.slug;
      }
    }
  }

  const canonicalIdBySlug = {};

  for (const def of CANONICAL_CATEGORIES) {
    const id = await findOrCreateCanonicalCategory(def, slugToId);
    canonicalIdBySlug[def.enSlug] = id;
    if (!dryRun) {
      await upsertCanonicalCategoryTranslations(id, def);
    }
    console.log(`Canonical: ${def.enSlug} → ${id}`);
  }

  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    include: {
      translations: { where: { locale: "en" }, take: 1 },
      categories: { include: { translations: { where: { locale: "en" } } } },
    },
  });

  const productMoves = [];

  for (const product of products) {
    const title = product.translations[0]?.title ?? "";
    const sourceSlugs = [];

    if (product.primaryCategoryId && idToEnSlug[product.primaryCategoryId]) {
      sourceSlugs.push(idToEnSlug[product.primaryCategoryId]);
    }

    for (const cat of product.categories) {
      const en = cat.translations[0]?.slug;
      if (en) sourceSlugs.push(en);
    }

    for (const cid of product.categoryIds) {
      if (idToEnSlug[cid]) sourceSlugs.push(idToEnSlug[cid]);
    }

    const targetSlug = resolveCanonicalSlug(sourceSlugs, title);
    const targetId = canonicalIdBySlug[targetSlug];

    productMoves.push({
      id: product.id,
      title,
      from: [...new Set(sourceSlugs)],
      to: targetSlug,
      targetId,
    });
  }

  console.log("\nProduct reclassification plan:");
  for (const move of productMoves) {
    console.log(
      `  ${move.title}: [${move.from.join(", ") || "none"}] → ${move.to}`,
    );
  }

  if (!dryRun) {
    for (const move of productMoves) {
      await prisma.product.update({
        where: { id: move.id },
        data: {
          primaryCategoryId: move.targetId,
          categoryIds: [move.targetId],
          categories: { set: [{ id: move.targetId }] },
        },
      });
    }

    const canonicalIds = Object.values(canonicalIdBySlug);
    const obsolete = allCategories.filter((c) => !canonicalIds.includes(c.id));

    for (const cat of obsolete) {
      const enSlug = idToEnSlug[cat.id] ?? "(no en slug)";
      await prisma.category.update({
        where: { id: cat.id },
        data: {
          published: false,
          parentId: null,
          homeStripPosition: null,
        },
      });
      console.log(`Unpublished obsolete category: ${enSlug} (${cat.id})`);
    }

    console.log("\nDone. Reclassified", productMoves.length, "products.");
    console.log("Unpublished", obsolete.length, "obsolete categories.");
    console.log("Category caches expire in ~5 minutes or restart the app.");
  } else {
    const obsoleteCount = allCategories.filter(
      (c) => !Object.values(canonicalIdBySlug).includes(c.id),
    ).length;
    console.log("\nDry run complete. Would move", productMoves.length, "products.");
    console.log("Would unpublish", obsoleteCount, "obsolete categories.");
    console.log("Run with --confirm to apply.");
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
