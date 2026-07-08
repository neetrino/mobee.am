#!/usr/bin/env node
"use strict";

const path = require("path");
const fs = require("fs");
const { SAMSUNG_PHONE_WHITELIST } = require("./whitelist.constants.cjs");
const { isHardRejected, isAccessory } = require("./whitelist.cjs");
const { normalize } = require("./normalize.cjs");

const ROOT = path.join(__dirname, "../../../..");
const OUT_DIR = path.join(ROOT, "audit/product-import/samsung");
const EXPECTED_PARENTS = 12;
const EXPECTED_VARIANTS = 96;
const IMPORT_RESULT = path.join(OUT_DIR, "samsung-import-result.json");

const HARD_REJECT_CHECKS = [
  ["No S24/S23/S22 imported", /galaxy\s+s(22|23|24)\b/i],
  ["No A55/A35/A25 imported", /galaxy\s+a(55|35|25)\b/i],
  ["No A15 imported", /galaxy\s+a15\b/i],
  ["No A16 5G imported", /galaxy\s+a16\s+5g\b/i],
  ["No Fold6/Flip6 imported", /galaxy\s+z\s+(fold|flip)\s*6\b/i],
  ["No Tab/Watch/Buds imported", /galaxy\s+(tab|watch|buds)\b/i],
  ["No accessories imported", /\b(case for|cover for|screen protector)\b/i],
];

const MISSING_SOURCE_MODELS = SAMSUNG_PHONE_WHITELIST.filter(
  (model) =>
    ![
      "Samsung Galaxy A07",
      "Samsung Galaxy A17",
      "Samsung Galaxy S25",
      "Samsung Galaxy S25+",
      "Samsung Galaxy S25 Ultra",
      "Samsung Galaxy S25 FE",
      "Samsung Galaxy S26",
      "Samsung Galaxy S26+",
      "Samsung Galaxy S26 Ultra",
      "Samsung Galaxy Z Fold7",
      "Samsung Galaxy Z Flip7",
      "Samsung Galaxy Z Flip7 FE",
    ].includes(model),
);

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

async function main() {
  loadEnv(path.join(ROOT, ".env"));
  const { PrismaClient } = require("../../shared/db/generated/client");
  const prisma = new PrismaClient();

  const importedModels = new Set();
  if (fs.existsSync(IMPORT_RESULT)) {
    const result = JSON.parse(fs.readFileSync(IMPORT_RESULT, "utf8"));
    for (const row of result.created_products || []) importedModels.add(row.model);
  }

  try {
    const products = await prisma.product.findMany({
      where: {
        deletedAt: null,
        brand: { slug: "samsung" },
        translations: {
          some: {
            locale: "en",
            title: { contains: "Samsung Galaxy", mode: "insensitive" },
          },
        },
      },
      include: {
        translations: { where: { locale: "en" } },
        variants: true,
        brand: true,
        categories: { include: { translations: { where: { locale: "en" } } } },
      },
    });

    const rows = [];
    let variantsFound = 0;
    let productsOk = 0;
    let productsWithIssues = 0;
    let brokenImages = 0;
    let duplicateProducts = 0;
    let duplicateVariants = 0;
    let wrongCategories = 0;
    const issues = [];
    const titleSet = new Set();

    for (const product of products) {
      const title = product.translations[0]?.title || "";
      const normalizedTitle = normalize(title);
      if (titleSet.has(normalizedTitle)) duplicateProducts += 1;
      titleSet.add(normalizedTitle);

      const categorySlugs = product.categories.flatMap((category) =>
        category.translations.map((translation) => translation.slug),
      );
      const categoryOk = categorySlugs.includes("phones");
      if (!categoryOk) wrongCategories += 1;

      const variantPids = new Set();
      let productOk = true;
      const variantCount = product.variants.length;
      variantsFound += variantCount;

      for (const variant of product.variants) {
        if (variantPids.has(variant.sourcePid)) duplicateVariants += 1;
        variantPids.add(variant.sourcePid);

        const priceOk = Number(variant.price) > 0;
        const stockOk = variant.stock === 10;
        const porOk = variant.priceOnRequest === false;
        const imageOk = Boolean(variant.imageUrl) || (Array.isArray(variant.media) && variant.media.length > 0);
        if (!imageOk) brokenImages += 1;
        if (!priceOk || !stockOk || !porOk || !imageOk) productOk = false;
      }

      if (productOk && categoryOk && product.brand?.slug === "samsung") productsOk += 1;
      else productsWithIssues += 1;

      const storage = new Set();
      const ram = new Set();
      const colors = new Set();
      const connectivity = new Set();
      for (const variant of product.variants) {
        const attrs = variant.attributes || {};
        if (attrs.storage) storage.add(attrs.storage);
        if (attrs.ram) ram.add(attrs.ram);
        if (attrs.color) colors.add(attrs.color);
        if (attrs.connectivity) connectivity.add(attrs.connectivity);
      }

      rows.push({
        product: title,
        dbId: product.id,
        variants: variantCount,
        stock: product.variants.every((variant) => variant.stock === 10) ? "10" : "mixed",
        priceOk: product.variants.every((variant) => Number(variant.price) > 0) ? "yes" : "no",
        imagesOk: product.variants.every(
          (variant) => Boolean(variant.imageUrl) || (Array.isArray(variant.media) && variant.media.length > 0),
        )
          ? "yes"
          : "no",
        category: categorySlugs.join(", ") || "—",
        result: productOk && categoryOk ? "OK" : "ISSUE",
        storage: [...storage].join(", ") || "—",
        ram: [...ram].join(", ") || "—",
        colors: [...colors].join(", ") || "—",
        connectivity: [...connectivity].join(", ") || "—",
      });
    }

    const allTitles = products.map((product) => product.translations[0]?.title || "").join(" | ");
    const safety = {};
    for (const [label, pattern] of HARD_REJECT_CHECKS) {
      safety[label] = pattern.test(allTitles) ? "FAIL" : "PASS";
    }
    safety["No missing-source whitelist models imported"] = MISSING_SOURCE_MODELS.some((model) =>
      products.some((product) => normalize(product.translations[0]?.title || "") === normalize(model)),
    )
      ? "FAIL"
      : "PASS";
    safety["All variants stock=10"] = products.every((product) =>
      product.variants.every((variant) => variant.stock === 10),
    )
      ? "PASS"
      : "FAIL";
    safety["All variants priceOnRequest=false"] = products.every((product) =>
      product.variants.every((variant) => variant.priceOnRequest === false),
    )
      ? "PASS"
      : "FAIL";
    safety["All variants price > 0"] = products.every((product) =>
      product.variants.every((variant) => Number(variant.price) > 0),
    )
      ? "PASS"
      : "FAIL";

    if (products.length !== EXPECTED_PARENTS) {
      issues.push(`Expected ${EXPECTED_PARENTS} parent products, found ${products.length}`);
    }
    if (variantsFound !== EXPECTED_VARIANTS) {
      issues.push(`Expected ${EXPECTED_VARIANTS} variants, found ${variantsFound}`);
    }
    for (const title of products.map((product) => product.translations[0]?.title || "")) {
      if (isHardRejected(title, title) || isAccessory(title, title)) {
        issues.push(`Hard-reject/accessory title imported: ${title}`);
      }
    }

    const lines = [];
    lines.push("# Samsung Post-Import Verification Report");
    lines.push("");
    lines.push(`> Generated: ${new Date().toISOString()}`);
    lines.push("");
    lines.push("## Summary");
    lines.push("");
    lines.push("| Metric | Count |");
    lines.push("| --- | ---: |");
    lines.push(`| Parent products expected | ${EXPECTED_PARENTS} |`);
    lines.push(`| Parent products found | ${products.length} |`);
    lines.push(`| Variants expected | ${EXPECTED_VARIANTS} |`);
    lines.push(`| Variants found | ${variantsFound} |`);
    lines.push(`| Products OK | ${productsOk} |`);
    lines.push(`| Products with issues | ${productsWithIssues} |`);
    lines.push(`| Broken images | ${brokenImages} |`);
    lines.push(`| Duplicate products | ${duplicateProducts} |`);
    lines.push(`| Duplicate variants | ${duplicateVariants} |`);
    lines.push(`| Wrong categories | ${wrongCategories} |`);
    lines.push(
      `| Hard-reject models accidentally imported | ${safety["No S24/S23/S22 imported"] === "FAIL" || safety["No A55/A35/A25 imported"] === "FAIL" ? 1 : 0} |`,
    );
    lines.push(
      `| Missing-source models accidentally imported | ${safety["No missing-source whitelist models imported"] === "FAIL" ? 1 : 0} |`,
    );
    lines.push("");
    lines.push("## Imported Products");
    lines.push("");
    lines.push("| Product | DB ID | Variants | Stock | Price OK | Images OK | Category | Result |");
    lines.push("| --- | --- | ---: | ---: | --- | --- | --- | --- |");
    if (!rows.length) lines.push("| — | — | — | — | — | — | — | — |");
    for (const row of rows) {
      lines.push(
        `| ${row.product} | ${row.dbId} | ${row.variants} | ${row.stock} | ${row.priceOk} | ${row.imagesOk} | ${row.category} | ${row.result} |`,
      );
    }
    lines.push("");
    lines.push("## Variant Attributes");
    lines.push("");
    lines.push("| Product | Variants | Storage | RAM | Colors | Connectivity |");
    lines.push("| --- | ---: | --- | --- | --- | --- |");
    for (const row of rows) {
      lines.push(
        `| ${row.product} | ${row.variants} | ${row.storage} | ${row.ram} | ${row.colors} | ${row.connectivity} |`,
      );
    }
    lines.push("");
    lines.push("## Safety Checks");
    lines.push("");
    lines.push("| Check | Result |");
    lines.push("| --- | --- |");
    for (const [label, result] of Object.entries(safety)) {
      lines.push(`| ${label} | ${result} |`);
    }
    lines.push("");
    lines.push("## Commands Used");
    lines.push("");
    lines.push("- `node scripts/product-import/pipelines/samsung/run-samsung-source-import.cjs --dry-run`");
    lines.push("- `node scripts/product-import/pipelines/samsung/run-samsung-source-import.cjs --import`");
    lines.push("- `node scripts/product-import/pipelines/samsung/post-import-verification.cjs`");
    lines.push("");
    lines.push("## Issues / Risks");
    lines.push("");
    if (!issues.length) lines.push("- None");
    else issues.forEach((issue) => lines.push(`- ${issue}`));
    lines.push("");
    lines.push("## Final Recommendation");
    lines.push("");
    const clean =
      products.length === EXPECTED_PARENTS &&
      variantsFound === EXPECTED_VARIANTS &&
      productsWithIssues === 0 &&
      Object.values(safety).every((value) => value === "PASS");
    lines.push(
      clean
        ? "Samsung import is clean and safe to keep."
        : "Samsung import needs review before treating catalog as production-ready.",
    );
    lines.push("");

    const reportPath = path.join(OUT_DIR, "samsung-post-import-verification-report.md");
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(reportPath, lines.join("\n"), "utf8");
    console.log(JSON.stringify({
      parent_products_found: products.length,
      variants_found: variantsFound,
      products_ok: productsOk,
      products_with_issues: productsWithIssues,
      clean,
    }, null, 2));
    console.log("Report:", reportPath);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("FATAL:", error.message);
  process.exit(1);
});
