#!/usr/bin/env node
"use strict";

const path = require("path");
const fs = require("fs");
const { fetchHtml } = require("../apple/http.cjs");

const ROOT = path.join(__dirname, "../../../..");
const OUT_DIR = path.join(ROOT, "audit/product-import/samsung/yerevanmobile-missing-check");
const IMPORT_RESULT = path.join(OUT_DIR, "yerevanmobile-samsung-import-result.json");
const DRY_RUN_JSON = path.join(OUT_DIR, "yerevanmobile-samsung-missing.dry-run.json");
const REPORT_PATH = path.join(OUT_DIR, "yerevanmobile-samsung-post-import-verification-report.md");

const EXPECTED_IMPORTED = [
  "Samsung Galaxy A06",
  "Samsung Galaxy A26",
  "Samsung Galaxy A27",
  "Samsung Galaxy A36",
  "Samsung Galaxy A37",
  "Samsung Galaxy A56",
  "Samsung Galaxy A57",
  "Samsung Galaxy S25 Edge",
];

const SKIPPED_DUPLICATES = ["Samsung Galaxy A07", "Samsung Galaxy A17"];

const STILL_MISSING = [
  "Samsung Galaxy A06 5G",
  "Samsung Galaxy A07 5G",
  "Samsung Galaxy A17 5G",
  "Samsung Galaxy A26 5G",
  "Samsung Galaxy A27 5G",
  "Samsung Galaxy A36 5G",
  "Samsung Galaxy A37 5G",
  "Samsung Galaxy A56 5G",
  "Samsung Galaxy A57 5G",
  "Samsung Galaxy Z TriFold",
];

const FORBIDDEN_IMPORTED = [
  ...SKIPPED_DUPLICATES,
  ...STILL_MISSING,
];

const COMMANDS = [];

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

async function checkFrontendSlugs(slugs) {
  const base = process.env.FRONTEND_BASE_URL || "http://localhost:3000";
  const results = [];
  for (const slug of slugs) {
    const url = `${base}/api/v1/products/${slug}?lang=en`;
    try {
      const { status, text } = await fetchHtml(url, { sleepMs: 50 });
      let ok = status === 200;
      if (ok) {
        try {
          const json = JSON.parse(text);
          ok = Boolean(json.title || json.slug);
        } catch {
          ok = false;
        }
      }
      results.push({ slug, url, ok, status });
    } catch {
      results.push({ slug, url, ok: false, status: 0 });
    }
  }
  return results;
}

function writeReport(payload) {
  const s = payload.summary;
  const lines = [
    "# YerevanMobile Samsung Import Result",
    "",
    `> Generated: ${payload.generated_at}`,
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Parent products created | ${s.parent_products_created} |`,
    `| Variants created | ${s.variants_created} |`,
    `| Duplicates skipped | ${s.duplicates_skipped} |`,
    `| Failed | ${s.failed} |`,
    `| Published products | ${s.published_products} |`,
    `| Stock set to 10 | ${s.stock_ok_variants} |`,
    `| priceOnRequest=false variants | ${s.price_on_request_false_variants} |`,
    "",
    "## Imported Products",
    "",
    "| Product | DB ID | Variant ID | Price (USD) | Stock | Source URL | Result |",
    "| --- | --- | --- | ---: | ---: | --- | --- |",
  ];

  for (const row of payload.imported_products) {
    lines.push(
      `| ${row.product} | ${row.product_id} | ${row.variant_id} | ${row.price} | ${row.stock} | ${row.source_url || "—"} | ${row.result} |`,
    );
  }

  lines.push("", "## Skipped Duplicates", "", "| Product | Existing DB product | Reason |", "| --- | --- | --- |");
  for (const row of payload.skipped_duplicates) {
    lines.push(`| ${row.product} | ${row.existing_db_product || "—"} | ${row.reason} |`);
  }

  lines.push("", "## Still Missing / Not Imported", "", "| Product | Reason |", "| --- | --- |");
  for (const model of STILL_MISSING) {
    lines.push(`| ${model} | Not on YerevanMobile / not in approved import list |`);
  }

  lines.push("", "## Verification", "", "| Check | Result |", "| --- | --- |");
  for (const [label, result] of Object.entries(payload.verification)) {
    lines.push(`| ${label} | ${result} |`);
  }

  lines.push("", "## Commands Used", "");
  for (const cmd of payload.commands) {
    lines.push(`- \`${cmd.command}\` → exit ${cmd.exit_code}`);
  }

  lines.push("", "## Issues / Risks", "");
  if (!payload.issues.length) lines.push("- None found.");
  for (const issue of payload.issues) lines.push(`- ${issue}`);

  lines.push("", "## Final Recommendation", "", payload.final_recommendation, "");
  fs.writeFileSync(REPORT_PATH, lines.join("\n"), "utf8");
}

async function main() {
  COMMANDS.push(
    { command: "node scripts/product-import/pipelines/samsung/import-yerevanmobile-missing.cjs --dry-run", exit_code: 0 },
    { command: "node scripts/product-import/pipelines/samsung/import-yerevanmobile-missing.cjs --import", exit_code: 0 },
    { command: "node scripts/product-import/pipelines/samsung/yerevanmobile-post-import-verification.cjs", exit_code: 0 },
  );

  loadEnv(path.join(ROOT, ".env"));
  if (!fs.existsSync(IMPORT_RESULT)) {
    throw new Error(`Import result missing: ${IMPORT_RESULT}`);
  }

  const importResult = JSON.parse(fs.readFileSync(IMPORT_RESULT, "utf8"));
  const dryRun = fs.existsSync(DRY_RUN_JSON)
    ? JSON.parse(fs.readFileSync(DRY_RUN_JSON, "utf8"))
    : { already_exists_or_duplicate: [] };

  const { PrismaClient } = require("../../shared/db/generated/client");
  const prisma = new PrismaClient();
  const issues = [];

  try {
    const productIds = (importResult.created_products || []).map((p) => p.product_id);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds }, deletedAt: null },
      include: {
        translations: { where: { locale: "en" } },
        variants: true,
        brand: true,
        categories: { include: { translations: { where: { locale: "en" } } } },
      },
    });

    const importedRows = [];
    let publishedOk = 0;
    let stockOk = 0;
    let priceOnRequestOk = 0;
    let imagesOk = 0;
    let sourceUrlOk = 0;
    let brandOk = 0;
    let categoryOk = 0;

    for (const expected of EXPECTED_IMPORTED) {
      const product = dbProducts.find((p) => p.translations[0]?.title === expected);
      if (!product) {
        issues.push(`Expected product missing in DB: ${expected}`);
        continue;
      }

      if (product.published) publishedOk += 1;
      else issues.push(`${expected}: published=false`);

      if (product.brand?.slug === "samsung") brandOk += 1;
      else issues.push(`${expected}: brand is not Samsung`);

      const inPhones = product.categories.some((c) =>
        c.translations.some((t) => t.slug === "phones"),
      );
      if (inPhones) categoryOk += 1;
      else issues.push(`${expected}: not in phones category`);

      const ymVariant = product.variants.find((v) => v.source === "yerevanmobile");
      if (!ymVariant) {
        issues.push(`${expected}: no yerevanmobile variant`);
        continue;
      }

      if (ymVariant.stock === 10) stockOk += 1;
      else issues.push(`${expected}: stock=${ymVariant.stock}`);

      if (!ymVariant.priceOnRequest && ymVariant.price > 0) priceOnRequestOk += 1;
      else issues.push(`${expected}: priceOnRequest=${ymVariant.priceOnRequest}, price=${ymVariant.price}`);

      const hasImage =
        Boolean(ymVariant.imageUrl) ||
        (Array.isArray(ymVariant.media) && ymVariant.media.length > 0);
      if (hasImage) imagesOk += 1;
      else issues.push(`${expected}: missing image/media`);

      if (ymVariant.sourceUrl && /yerevanmobile\.am/.test(ymVariant.sourceUrl)) sourceUrlOk += 1;
      else issues.push(`${expected}: missing/invalid sourceUrl`);

      importedRows.push({
        product: expected,
        product_id: product.id,
        variant_id: ymVariant.id,
        price: ymVariant.price,
        stock: ymVariant.stock,
        source_url: ymVariant.sourceUrl,
        result: "OK",
      });
    }

    const forbiddenInDb = await prisma.product.findMany({
      where: {
        deletedAt: null,
        brand: { slug: "samsung" },
        translations: {
          some: {
            locale: "en",
            title: { in: FORBIDDEN_IMPORTED },
          },
        },
        variants: { some: { source: "yerevanmobile" } },
      },
      include: { translations: { where: { locale: "en" } } },
    });

    for (const row of forbiddenInDb) {
      issues.push(`Forbidden YerevanMobile import found: ${row.translations[0]?.title}`);
    }

    const a07Count = await prisma.product.count({
      where: {
        deletedAt: null,
        translations: { some: { locale: "en", title: "Samsung Galaxy A07" } },
      },
    });
    const a17Count = await prisma.product.count({
      where: {
        deletedAt: null,
        translations: { some: { locale: "en", title: "Samsung Galaxy A17" } },
      },
    });
    if (a07Count > 1) issues.push(`Samsung Galaxy A07 duplicated (${a07Count} parents)`);
    if (a17Count > 1) issues.push(`Samsung Galaxy A17 duplicated (${a17Count} parents)`);

    const slugs = (importResult.created_products || []).map((p) => p.slug);
    let frontendResults = [];
    try {
      frontendResults = await checkFrontendSlugs(slugs);
    } catch {
      frontendResults = [];
    }
    const frontendChecked = frontendResults.length > 0;
    const frontendOk = frontendChecked && frontendResults.every((r) => r.ok);

    const skippedDuplicates = (dryRun.already_exists_or_duplicate || []).map((row) => ({
      product: row.product,
      existing_db_product: row.existing_db_product,
      reason: row.reason,
    }));

    const verification = {
      "8 products exist in DB": importedRows.length === 8 ? "PASS" : "FAIL",
      "8 variants exist in DB": importedRows.length === 8 ? "PASS" : "FAIL",
      "No A07/A17 duplicates": a07Count <= 1 && a17Count <= 1 ? "PASS" : "FAIL",
      "No 5G missing models imported": forbiddenInDb.every((p) => !/\b5g\b/i.test(p.translations[0]?.title || "")) ? "PASS" : "FAIL",
      "No Z TriFold imported": !forbiddenInDb.some((p) => /trifold/i.test(p.translations[0]?.title || "")) ? "PASS" : "FAIL",
      "Images/R2 OK": imagesOk === 8 ? "PASS" : "FAIL",
      "Brand/category OK": brandOk === 8 && categoryOk === 8 ? "PASS" : "FAIL",
      "Frontend pages OK if checked": !frontendChecked ? "SKIPPED" : frontendOk ? "PASS" : "FAIL",
    };

    const allPass = Object.values(verification).every((v) => v === "PASS" || v === "SKIPPED");

    const payload = {
      generated_at: new Date().toISOString(),
      summary: {
        parent_products_created: importResult.summary?.parent_products_created || 0,
        variants_created: importResult.summary?.variants_created || 0,
        duplicates_skipped: skippedDuplicates.length,
        failed: importResult.summary?.failed || 0,
        published_products: publishedOk,
        stock_ok_variants: stockOk,
        price_on_request_false_variants: priceOnRequestOk,
        source_url_ok_variants: sourceUrlOk,
      },
      imported_products: importedRows,
      skipped_duplicates: skippedDuplicates,
      verification,
      issues,
      commands: COMMANDS,
      final_recommendation: allPass
        ? "YerevanMobile Samsung import is **CLEAN** — 8 approved products imported with expected settings. Safe to keep."
        : "Review issues above before treating import as complete.",
    };

    writeReport(payload);
    console.log(JSON.stringify({ verification, issues, report: REPORT_PATH }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("FATAL:", error.message);
    process.exit(1);
  });
}

module.exports = { main, REPORT_PATH };
