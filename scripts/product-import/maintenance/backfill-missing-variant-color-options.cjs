#!/usr/bin/env node
/**
 * Backfill ProductVariantOption (color) so DB is the source of truth
 * for admin and storefront. JSONB / media alt are only evidence to write options.
 *
 * Usage:
 *   node scripts/product-import/maintenance/backfill-missing-variant-color-options.cjs
 *   node scripts/product-import/maintenance/backfill-missing-variant-color-options.cjs --apply --confirm-catalog-colors
 *
 * Default: dry-run
 */

"use strict";

const path = require("path");
const fs = require("fs");

const ROOT = path.join(__dirname, "../../..");
const OUT_DIR = path.join(ROOT, "audit/product-import");
const { syncCatalogVariantColor } = require("../shared/catalog-color-variant-sync.cjs");
const { recoverCatalogColorFromEvidence } = require("../shared/catalog-color-recover.cjs");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  fs.readFileSync(filePath, "utf8").split("\n").forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return;
    const eq = t.indexOf("=");
    if (eq < 1) return;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  });
}

loadEnv(path.join(ROOT, ".env"));

const APPLY = process.argv.includes("--apply") && !process.argv.includes("--dry-run");
const CONFIRMED = process.argv.includes("--confirm-catalog-colors");

function summarize(rows) {
  return {
    variants_scanned: rows.length,
    colors_ok: rows.filter((row) => row.status === "ok").length,
    skip_no_color: rows.filter((row) => row.status === "skip_no_color").length,
    manual_review: rows.filter((row) => row.status === "manual_review").length,
    options_to_create: rows.filter((row) => row.variantOptionAction === "create").length,
    options_to_update: rows.filter((row) => row.variantOptionAction === "update").length,
  };
}

async function loadVariantsMissingColor(prisma) {
  return prisma.productVariant.findMany({
    where: {
      product: { deletedAt: null },
      NOT: {
        options: {
          some: {
            OR: [{ attributeKey: "color" }, { attributeKey: "colour" }],
          },
        },
      },
    },
    select: {
      id: true,
      sku: true,
      attributes: true,
      media: true,
      productId: true,
      product: {
        select: {
          translations: {
            where: { locale: "en" },
            select: { slug: true, title: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

function toRow(variant, syncResult, recoveredColor) {
  const translation = variant.product.translations[0];
  return {
    productId: variant.productId,
    product: translation?.slug || variant.productId,
    title: translation?.title || null,
    variantId: variant.id,
    sku: variant.sku,
    recoveredColor,
    status: syncResult.status,
    colorName: syncResult.colorName || null,
    attributeValueAction: syncResult.attributeValueAction || "none",
    variantOptionAction: syncResult.variantOptionAction || "none",
    productAttributeAction: syncResult.productAttributeAction || "none",
    reason: syncResult.reason || null,
  };
}

async function main() {
  console.log("=== Backfill missing variant color options ===");
  console.log(APPLY ? "MODE: APPLY" : "MODE: DRY-RUN");

  if (APPLY && !CONFIRMED) {
    console.error("Refuse apply without --confirm-catalog-colors");
    process.exit(1);
  }

  const { PrismaClient } = require(path.join(ROOT, "shared/db/generated/client"));
  const prisma = new PrismaClient();

  try {
    const variants = await loadVariantsMissingColor(prisma);
    const rows = [];

    for (const variant of variants) {
      const recoveredColor = recoverCatalogColorFromEvidence({
        attributes: variant.attributes,
        media: variant.media,
      });
      const syncResult = await syncCatalogVariantColor(prisma, {
        productId: variant.productId,
        variantId: variant.id,
        attributes: variant.attributes,
        media: variant.media,
        apply: APPLY,
      });
      rows.push(toRow(variant, syncResult, recoveredColor));
    }

    const summary = summarize(rows);
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const outFile = path.join(OUT_DIR, "backfill-missing-variant-color-options.json");
    fs.writeFileSync(outFile, JSON.stringify({ summary, rows }, null, 2), "utf8");
    console.log(JSON.stringify(summary, null, 2));
    console.log(`Wrote ${outFile}`);

    if (APPLY) {
      const productIds = [
        ...new Set(
          rows
            .filter(
              (row) =>
                row.variantOptionAction === "create" ||
                row.variantOptionAction === "update",
            )
            .map((row) => row.productId),
        ),
      ];
      if (productIds.length > 0) {
        const deleted = await prisma.productPdpRow.deleteMany({
          where: { productId: { in: productIds } },
        });
        console.log(`Deleted stale PDP rows: ${deleted.count}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
