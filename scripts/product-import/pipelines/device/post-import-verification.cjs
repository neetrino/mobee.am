#!/usr/bin/env node
"use strict";

const path = require("path");
const fs = require("fs");
const {
  isDysonHardRejected,
  isPlayStationHardRejected,
  isDysonHairDevice,
  isPlayStationConsoleProduct,
  categorySlugForParentModel,
  normalizeDysonParentModel,
  normalize,
} = require("./normalize.cjs");
const { DYSON_HAIR_PARENT_MODELS } = require("./targets.cjs");

function isSourceImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  return /mobilecentre\.am|yerevanmobile\.am/i.test(url);
}

const ROOT = path.join(__dirname, "../../../..");
const OUT_DIR = path.join(ROOT, "audit/product-import/device");
const IMPORT_RESULT = path.join(OUT_DIR, "device-import-result.json");

function loadEnv(filePath) {
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

async function main() {
  loadEnv(path.join(ROOT, ".env"));
  const { PrismaClient } = require("../../../../shared/db/generated/client");
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
        OR: [
          { brand: { slug: "dyson" } },
          { brand: { slug: "sony" } },
          {
            translations: {
              some: {
                locale: "en",
                OR: [
                  { title: { contains: "Dyson", mode: "insensitive" } },
                  { title: { contains: "PlayStation", mode: "insensitive" } },
                ],
              },
            },
          },
        ],
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
      const isDyson = /\bdyson\b/i.test(title);
      const parentModel = isDyson ? normalizeDysonParentModel(title, title) || title : title;
      const expectedCategory = isDyson
        ? categorySlugForParentModel(parentModel) || "hair-dryers"
        : "game-consoles";
      const categoryOk = categorySlugs.includes(expectedCategory);
      if (!categoryOk) wrongCategories += 1;

      const expectedBrand = isDyson ? "dyson" : "sony";
      const brandOk = product.brand?.slug === expectedBrand;
      const descHtml = product.translations[0]?.descriptionHtml || "";
      let sourceImageLeak = false;

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
        if (isSourceImageUrl(variant.imageUrl)) sourceImageLeak = true;
        if (Array.isArray(variant.media)) {
          for (const item of variant.media) {
            const url = typeof item === "string" ? item : item?.url;
            if (isSourceImageUrl(url)) sourceImageLeak = true;
          }
        }
        if (!imageOk) brokenImages += 1;
        if (!priceOk || !stockOk || !porOk || !imageOk) productOk = false;
      }
      if (Array.isArray(product.media)) {
        for (const item of product.media) {
          const url = typeof item === "string" ? item : item?.url;
          if (isSourceImageUrl(url)) sourceImageLeak = true;
        }
      }
      if (sourceImageLeak) productOk = false;

      if (productOk && categoryOk && brandOk) productsOk += 1;
      else productsWithIssues += 1;

      const storage = new Set();
      const colors = new Set();
      const kits = new Set();
      const hairTypes = new Set();
      for (const variant of product.variants) {
        const attrs = variant.attributes || {};
        if (attrs.storage) storage.add(attrs.storage);
        if (attrs.color) colors.add(attrs.color);
        if (attrs.kit) kits.add(attrs.kit);
        if (attrs.hair_type) hairTypes.add(attrs.hair_type);
      }

      rows.push({
        product: title,
        type: isDyson ? "dyson" : "playstation",
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
        brand: product.brand?.slug || "—",
        descLen: descHtml.length,
        sourceLeak: sourceImageLeak ? "YES" : "no",
        result: productOk && categoryOk && brandOk ? "OK" : "ISSUE",
        storage: [...storage].join(", ") || "—",
        colors: [...colors].join(", ") || "—",
        kits: [...kits].join(", ") || "—",
        hairTypes: [...hairTypes].join(", ") || "—",
      });

      if (isDyson) {
        const allowed =
          DYSON_HAIR_PARENT_MODELS.some((model) => normalize(model) === normalize(title)) ||
          Boolean(normalizeDysonParentModel(title, title));
        if (!allowed || isDysonHardRejected(title, title) || !isDysonHairDevice(title, title)) {
          issues.push(`Invalid or disallowed Dyson product imported: ${title}`);
        }
      }
      if (!isDyson && (isPlayStationHardRejected(title, title) || !isPlayStationConsoleProduct(title, title))) {
        issues.push(`Invalid PlayStation product imported: ${title}`);
      }
      if (sourceImageLeak) issues.push(`Source image URL leakage: ${title}`);
    }

    const allTitles = products.map((product) => product.translations[0]?.title || "").join(" | ");
    const dysonTitles = products
      .filter((product) => /\bdyson\b/i.test(product.translations[0]?.title || ""))
      .map((product) => product.translations[0]?.title || "");
    const onlyApprovedHair = dysonTitles.every((title) => {
      const parent = normalizeDysonParentModel(title, title);
      return parent && DYSON_HAIR_PARENT_MODELS.includes(parent);
    });
    const safety = {
      "Only approved Dyson hair devices imported": onlyApprovedHair ? "PASS" : "FAIL",
      "No vacuum/purifier/climate Dyson":
        /\b(vacuum|purifier|humidif|gen5|hot.?cool|solarcycle|zone)\b/i.test(allTitles) ? "FAIL" : "PASS",
      "No PlayStation controllers imported": /\bcontroller\b|\bdualsense\b/i.test(allTitles) ? "FAIL" : "PASS",
      "No source image leakage": rows.some((row) => row.sourceLeak === "YES") ? "FAIL" : "PASS",
      "All variants stock=10": products.every((product) => product.variants.every((variant) => variant.stock === 10))
        ? "PASS"
        : "FAIL",
      "All variants priceOnRequest=false": products.every((product) =>
        product.variants.every((variant) => variant.priceOnRequest === false),
      )
        ? "PASS"
        : "FAIL",
      "All variants price > 0": products.every((product) =>
        product.variants.every((variant) => Number(variant.price) > 0),
      )
        ? "PASS"
        : "FAIL",
    };

    const dysonCount = rows.filter((row) => row.type === "dyson").length;
    const psCount = rows.filter((row) => row.type === "playstation").length;

    const lines = [];
    lines.push("# Device Post-Import Verification Report");
    lines.push("");
    lines.push(`> Generated: ${new Date().toISOString()}`);
    lines.push("");
    lines.push("## Summary");
    lines.push("");
    lines.push("| Metric | Count |");
    lines.push("| --- | ---: |");
    lines.push(`| Dyson parent products found | ${dysonCount} |`);
    lines.push(`| PlayStation parent products found | ${psCount} |`);
    lines.push(`| Variants found | ${variantsFound} |`);
    lines.push(`| Products OK | ${productsOk} |`);
    lines.push(`| Products with issues | ${productsWithIssues} |`);
    lines.push(`| Broken images | ${brokenImages} |`);
    lines.push(`| Duplicate products | ${duplicateProducts} |`);
    lines.push(`| Duplicate variants | ${duplicateVariants} |`);
    lines.push(`| Wrong categories | ${wrongCategories} |`);
    lines.push(`| Imported models tracked | ${importedModels.size} |`);
    lines.push("");
    lines.push("## Imported Products");
    lines.push("");
    lines.push(
      "| Product | Type | DB ID | Variants | Stock | Price OK | Images OK | Category | Brand | DescLen | SourceLeak | Result |",
    );
    lines.push("| --- | --- | --- | ---: | ---: | --- | --- | --- | --- | ---: | --- | --- |");
    if (!rows.length) lines.push("| — | — | — | — | — | — | — | — | — | — | — | — |");
    for (const row of rows) {
      lines.push(
        `| ${row.product} | ${row.type} | ${row.dbId} | ${row.variants} | ${row.stock} | ${row.priceOk} | ${row.imagesOk} | ${row.category} | ${row.brand} | ${row.descLen} | ${row.sourceLeak} | ${row.result} |`,
      );
    }
    lines.push("");
    lines.push("## Variant Attributes");
    lines.push("");
    lines.push("| Product | Variants | Colors | Kits | Hair types | Storage |");
    lines.push("| --- | ---: | --- | --- | --- | --- |");
    for (const row of rows) {
      lines.push(
        `| ${row.product} | ${row.variants} | ${row.colors} | ${row.kits} | ${row.hairTypes} | ${row.storage} |`,
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
    lines.push("- `node scripts/product-import/pipelines/device/run-device-source-import.cjs --dry-run`");
    lines.push("- `node scripts/product-import/pipelines/device/run-device-source-import.cjs --import`");
    lines.push("- `node scripts/product-import/pipelines/device/post-import-verification.cjs`");
    lines.push("");
    lines.push("## Issues / Risks");
    lines.push("");
    if (!issues.length) lines.push("- None");
    else issues.forEach((issue) => lines.push(`- ${issue}`));
    lines.push("");
    lines.push("## Final Recommendation");
    lines.push("");
    const clean = productsWithIssues === 0 && Object.values(safety).every((value) => value === "PASS");
    lines.push(
      clean
        ? "Device import is clean and safe to keep."
        : "Device import needs review before treating catalog as production-ready.",
    );
    lines.push("");

    const reportPath = path.join(OUT_DIR, "device-post-import-verification-report.md");
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(reportPath, lines.join("\n"), "utf8");

    console.log(
      JSON.stringify(
        {
          dyson_parent_products: dysonCount,
          playstation_parent_products: psCount,
          variants_found: variantsFound,
          products_ok: productsOk,
          products_with_issues: productsWithIssues,
          clean,
        },
        null,
        2,
      ),
    );
    console.log("Report:", reportPath);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("FATAL:", error.message);
  process.exit(1);
});
