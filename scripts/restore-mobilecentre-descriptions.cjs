#!/usr/bin/env node
/**
 * Rebuild MobileCentre product descriptions from source JSON.
 *
 * Usage:
 *   node scripts/restore-mobilecentre-descriptions.cjs --dry-run
 *   CONFIRM_RESTORE_DESCRIPTIONS=YES node scripts/restore-mobilecentre-descriptions.cjs
 *
 * Default JSON path:
 *   ../mobilecentre_apple_variable_products.json
 *   or C:/AI/mobee-local-artifacts-backup/mobilecentre_apple_variable_products.json
 */

"use strict";

const path = require("path");
const fs = require("fs");
const { buildDescriptionHtml } = require("./lib/mobilecentre-description-html.cjs");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  fs.readFileSync(filePath, "utf8").split("\n").forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return;
    const eq = t.indexOf("=");
    if (eq < 1) return;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  });
}

loadEnv(path.join(__dirname, "../.env"));

const { PrismaClient } = require("../shared/db/generated/client");
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes("--dry-run");
const CONFIRMED = process.env.CONFIRM_RESTORE_DESCRIPTIONS === "YES";

const JSON_CANDIDATES = [
  process.env.MOBILECENTRE_VARIABLE_PRODUCTS_JSON,
  path.join(__dirname, "../mobilecentre_apple_variable_products.json"),
  "C:/AI/mobee-local-artifacts-backup/mobilecentre_apple_variable_products.json",
].filter(Boolean);

function resolveJsonPath() {
  for (const candidate of JSON_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    `Source JSON not found. Tried:\n${JSON_CANDIDATES.map((p) => `  - ${p}`).join("\n")}`,
  );
}

async function findProductIdForGroup(group) {
  const variants = Array.isArray(group.variants) ? group.variants : [];
  for (const item of variants) {
    if (!item?.source_pid) continue;
    const sourcePid = String(item.source_pid);
    const bySource = await prisma.productVariant.findFirst({
      where: { source: "mobilecentre", sourcePid },
      select: { productId: true },
    });
    if (bySource) return bySource.productId;

    const bySku = await prisma.productVariant.findUnique({
      where: { sku: `mc-${sourcePid}` },
      select: { productId: true },
    });
    if (bySku) return bySku.productId;
  }
  return null;
}

async function main() {
  const jsonPath = resolveJsonPath();
  console.log("=== Restore MobileCentre descriptions ===");
  console.log(`Source: ${jsonPath}`);
  if (DRY_RUN) console.log("DRY RUN — no database writes");

  const groups = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  if (!Array.isArray(groups)) {
    throw new Error("Expected top-level JSON array of product groups");
  }

  let updated = 0;
  let skipped = 0;
  let emptyHtml = 0;

  for (const group of groups) {
    const descHtml = buildDescriptionHtml(group.description || "");
    if (!descHtml) {
      emptyHtml++;
      continue;
    }

    const productId = await findProductIdForGroup(group);
    if (!productId) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      updated++;
      continue;
    }

    if (!CONFIRMED) continue;

    await prisma.productTranslation.updateMany({
      where: { productId },
      data: { descriptionHtml: descHtml },
    });
    updated++;
    if (updated % 20 === 0) {
      process.stdout.write(`\r  Updated: ${updated}/${groups.length}`);
    }
  }

  console.log(`\n  ✓ Updated: ${updated}, skipped (not in DB): ${skipped}, empty source: ${emptyHtml}`);
  if (!DRY_RUN && !CONFIRMED && updated > 0) {
    console.log("  Set CONFIRM_RESTORE_DESCRIPTIONS=YES to apply changes.");
  }
  console.log("=== Done ===");
}

main()
  .catch((err) => {
    console.error("\n❌", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
