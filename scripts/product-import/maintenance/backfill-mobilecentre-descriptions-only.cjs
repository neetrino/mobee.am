#!/usr/bin/env node
/**
 * Backfill ProductTranslation.descriptionHtml from MobileCentre variable JSON.
 * Does NOT touch products, variants, prices, images, slugs, or categories.
 *
 * Usage:
 *   node scripts/backfill-mobilecentre-descriptions-only.cjs --input mobilecentre_apple_variable_products.json
 *   node scripts/backfill-mobilecentre-descriptions-only.cjs --input mobilecentre_apple_variable_products.json --confirm
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { buildDescriptionHtml } = require("../shared/mobilecentre-description-html.cjs");

const ROOT = path.join(__dirname, "../../..");
const LOCALES = ["en", "hy", "ru"];
const HTML_TAG_RE = /<\/?[a-z][\s\S]*>/i;

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

loadEnv(path.join(ROOT, ".env"));

const { PrismaClient } = require("../../../shared/db/generated/client");
const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  let input = path.join(ROOT, "data/product-import/apple/mobilecentre_apple_variable_products.json");
  let confirm = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--input" && args[i + 1]) {
      input = path.isAbsolute(args[i + 1]) ? args[i + 1] : path.join(process.cwd(), args[i + 1]);
      i++;
    } else if (args[i] === "--confirm") {
      confirm = true;
    }
  }

  return { input, confirm, dryRun: !confirm };
}

function resolveDescriptionFromGroup(group) {
  const variants = Array.isArray(group.variants) ? group.variants : [];

  const candidates = [
    group.descriptionHtml,
    group.description,
    ...variants.map((v) => v.descriptionHtml),
    ...variants.map((v) => v.description),
  ];

  for (const raw of candidates) {
    if (raw == null) continue;
    const text = String(raw).trim();
    if (!text) continue;

    if (HTML_TAG_RE.test(text)) {
      return { html: text, source: "html" };
    }

    const built = buildDescriptionHtml(text);
    if (built) {
      return { html: built, source: "raw" };
    }
  }

  return null;
}

function collectSourcePids(group) {
  const pids = new Set();
  for (const item of group.variants || []) {
    if (item?.source_pid) pids.add(String(item.source_pid));
  }
  return [...pids];
}

async function findProductForGroup(group, productBySourcePid, productBySku) {
  for (const sourcePid of collectSourcePids(group)) {
    if (productBySourcePid.has(sourcePid)) {
      return { productId: productBySourcePid.get(sourcePid), sourcePid };
    }
    const sku = `mc-${sourcePid}`;
    if (productBySku.has(sku)) {
      return { productId: productBySku.get(sku), sourcePid };
    }
  }
  return null;
}

async function loadMobileCentreProductIndex() {
  const variants = await prisma.productVariant.findMany({
    where: { source: "mobilecentre" },
    select: { productId: true, sourcePid: true, sku: true },
  });

  const productBySourcePid = new Map();
  const productBySku = new Map();

  for (const v of variants) {
    if (v.sourcePid) productBySourcePid.set(String(v.sourcePid), v.productId);
    if (v.sku) productBySku.set(v.sku, v.productId);
  }

  const productIds = [...new Set(variants.map((v) => v.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, deletedAt: null },
    select: {
      id: true,
      translations: {
        select: { id: true, locale: true, slug: true, title: true, descriptionHtml: true },
      },
    },
  });

  const productById = new Map(products.map((p) => [p.id, p]));
  return { productBySourcePid, productBySku, productById };
}

function assertUpdatePayloadSafe(data) {
  const keys = Object.keys(data);
  if (keys.length !== 1 || keys[0] !== "descriptionHtml") {
    throw new Error(`Unsafe update payload keys: ${keys.join(", ")}`);
  }
}

async function main() {
  const { input, dryRun } = parseArgs();

  console.log("\n═══════════════════════════════════════════════");
  console.log("  MobileCentre Description-Only Backfill");
  console.log("═══════════════════════════════════════════════\n");
  console.log(`  Mode:       ${dryRun ? "DRY-RUN (no writes)" : "CONFIRM (writes enabled)"}`);
  console.log(`  Input:      ${input}\n`);

  if (!fs.existsSync(input)) {
    console.error(`❌  Input file not found: ${input}`);
    process.exit(1);
  }

  const groups = JSON.parse(fs.readFileSync(input, "utf8"));
  if (!Array.isArray(groups)) {
    console.error("❌  Expected JSON array of parent groups.");
    process.exit(1);
  }

  const { productBySourcePid, productBySku, productById } = await loadMobileCentreProductIndex();

  const stats = {
    totalParentGroups: groups.length,
    groupsWithDescription: 0,
    groupsWithoutDescription: 0,
    matchedDbProducts: 0,
    missingDbProducts: 0,
    translationsToUpdate: 0,
    translationsAlreadyFilled: 0,
    translationsSkippedIdentical: 0,
    missingTranslationRows: 0,
    updatedTranslations: 0,
    skippedGroups: 0,
  };

  const plannedUpdates = [];
  const missingProducts = [];
  const updatesByProduct = new Map();

  for (const group of groups) {
    const resolved = resolveDescriptionFromGroup(group);
    const model = group.model || group.name || "(unknown)";

    if (!resolved) {
      stats.groupsWithoutDescription++;
      continue;
    }
    stats.groupsWithDescription++;

    const match = await findProductForGroup(group, productBySourcePid, productBySku);
    if (!match) {
      stats.missingDbProducts++;
      missingProducts.push({ model, sourcePids: collectSourcePids(group) });
      continue;
    }

    const product = productById.get(match.productId);
    if (!product) {
      stats.missingDbProducts++;
      continue;
    }

    stats.matchedDbProducts++;

    if (!updatesByProduct.has(product.id)) {
      updatesByProduct.set(product.id, {
        productId: product.id,
        model,
        sourcePid: match.sourcePid,
        html: resolved.html,
        translations: product.translations,
      });
    }
  }

  for (const entry of updatesByProduct.values()) {
    const translationByLocale = new Map(
      entry.translations.map((t) => [t.locale, t])
    );

    for (const locale of LOCALES) {
      const tr = translationByLocale.get(locale);
      if (!tr) {
        stats.missingTranslationRows++;
        continue;
      }

      const oldLen = (tr.descriptionHtml || "").length;
      const newLen = entry.html.length;

      if (oldLen > 0 && tr.descriptionHtml === entry.html) {
        stats.translationsSkippedIdentical++;
        stats.translationsAlreadyFilled++;
        continue;
      }

      if (oldLen > 0) {
        stats.translationsAlreadyFilled++;
      }

      stats.translationsToUpdate++;

      if (plannedUpdates.length < 10) {
        plannedUpdates.push({
          productId: entry.productId,
          slug: tr.slug,
          sourcePid: entry.sourcePid,
          locale,
          model: entry.model,
          oldDescriptionLength: oldLen,
          newDescriptionLength: newLen,
        });
      }
    }
  }

  console.log("┌─ Dry-run summary ──────────────────────────────────");
  console.log(`│  Total parent groups:        ${stats.totalParentGroups}`);
  console.log(`│  Groups with description:    ${stats.groupsWithDescription}`);
  console.log(`│  Groups without description: ${stats.groupsWithoutDescription}`);
  console.log(`│  Matched DB products:        ${updatesByProduct.size}`);
  console.log(`│  Missing DB products:        ${stats.missingDbProducts}`);
  console.log(`│  Translations to update:     ${stats.translationsToUpdate}`);
  console.log(`│  Already filled (any len):   ${stats.translationsAlreadyFilled}`);
  console.log(`│  Skipped (identical HTML):   ${stats.translationsSkippedIdentical}`);
  console.log(`│  Missing translation rows:    ${stats.missingTranslationRows}`);
  console.log("└────────────────────────────────────────────────────\n");

  if (missingProducts.length) {
    console.log("Missing DB products (sample up to 10):");
    for (const m of missingProducts.slice(0, 10)) {
      console.log(`  - ${m.model}  pids=${m.sourcePids.join(",")}`);
    }
    console.log("");
  }

  if (plannedUpdates.length) {
    console.log("Sample planned updates (up to 10):");
    for (const u of plannedUpdates) {
      console.log(
        `  - ${u.model} | ${u.slug} | ${u.locale} | pid=${u.sourcePid} | ${u.oldDescriptionLength} → ${u.newDescriptionLength}`
      );
    }
    console.log("");
  }

  if (dryRun) {
    console.log("✅  Dry-run complete. Re-run with --confirm to apply.\n");
    return;
  }

  if (stats.translationsToUpdate === 0) {
    console.log("⚠️  Nothing to update. Exiting.\n");
    return;
  }

  console.log("Applying updates (ProductTranslation.descriptionHtml only)...\n");

  for (const entry of updatesByProduct.values()) {
    const translationByLocale = new Map(
      entry.translations.map((t) => [t.locale, t])
    );

    for (const locale of LOCALES) {
      const tr = translationByLocale.get(locale);
      if (!tr) continue;
      if (tr.descriptionHtml === entry.html) continue;

      const payload = { descriptionHtml: entry.html };
      assertUpdatePayloadSafe(payload);

      await prisma.productTranslation.update({
        where: { id: tr.id },
        data: payload,
      });
      stats.updatedTranslations++;
    }
  }

  const withDescRows = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS cnt
    FROM product_translations pt
    JOIN products p ON p.id = pt."productId"
    JOIN product_variants v ON v."productId" = p.id
    WHERE v.source = 'mobilecentre'
      AND p."deletedAt" IS NULL
      AND pt."descriptionHtml" IS NOT NULL
      AND LENGTH(TRIM(pt."descriptionHtml")) > 0
  `;

  const byLocale = await prisma.$queryRaw`
    SELECT pt.locale, COUNT(*)::int AS cnt
    FROM product_translations pt
    JOIN products p ON p.id = pt."productId"
    JOIN product_variants v ON v."productId" = p.id
    WHERE v.source = 'mobilecentre'
      AND p."deletedAt" IS NULL
      AND pt."descriptionHtml" IS NOT NULL
      AND LENGTH(TRIM(pt."descriptionHtml")) > 0
    GROUP BY pt.locale
    ORDER BY pt.locale
  `;

  console.log("┌─ Confirm result ───────────────────────────────────");
  console.log(`│  Updated translations:       ${stats.updatedTranslations}`);
  console.log(`│  Skipped groups (no desc):    ${stats.groupsWithoutDescription}`);
  console.log(`│  Missing products:            ${stats.missingDbProducts}`);
  console.log(`│  Missing translation rows:    ${stats.missingTranslationRows}`);
  console.log(`│  Non-empty descriptionHtml:   ${withDescRows[0]?.cnt ?? 0}`);
  for (const row of byLocale) {
    console.log(`│    ${row.locale}: ${row.cnt}`);
  }
  console.log("└────────────────────────────────────────────────────\n");
  console.log("✅  Backfill complete. Product detail cache TTL ~120s — invalidate or wait.\n");
}

main()
  .catch((err) => {
    console.error("\n❌", err.message || err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
