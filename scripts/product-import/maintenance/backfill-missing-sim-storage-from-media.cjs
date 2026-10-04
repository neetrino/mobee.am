#!/usr/bin/env node
/**
 * Fill missing SIM / storage ProductVariantOption from media alt evidence
 * when the product already uses those attributes (admin shows empty placeholders).
 *
 * Usage:
 *   node scripts/product-import/maintenance/backfill-missing-sim-storage-from-media.cjs
 *   node scripts/product-import/maintenance/backfill-missing-sim-storage-from-media.cjs --apply --confirm-media-sim-storage
 */

"use strict";

const path = require("path");
const fs = require("fs");

const ROOT = path.join(__dirname, "../../..");
const OUT_DIR = path.join(ROOT, "audit/product-import");
const { recoverSimStorageFromEvidence } = require("../shared/catalog-sim-storage-recover.cjs");
const { syncCatalogVariantSim } = require("../shared/catalog-sim-variant-sync.cjs");
const { syncCatalogVariantStorage } = require("../shared/catalog-storage-variant-sync.cjs");

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
const CONFIRMED = process.argv.includes("--confirm-media-sim-storage");

function hasOption(options, keys) {
  return options.some((opt) => keys.includes(opt.attributeKey));
}

async function main() {
  console.log("=== Backfill missing SIM/storage from media ===");
  console.log(APPLY ? "MODE: APPLY" : "MODE: DRY-RUN");

  if (APPLY && !CONFIRMED) {
    console.error("Refuse apply without --confirm-media-sim-storage");
    process.exit(1);
  }

  const { PrismaClient } = require(path.join(ROOT, "shared/db/generated/client"));
  const prisma = new PrismaClient();

  try {
    const [simAttr, storageAttr] = await Promise.all([
      prisma.attribute.findUnique({ where: { key: "sim" } }),
      prisma.attribute.findUnique({ where: { key: "storage" } }),
    ]);
    if (!simAttr || !storageAttr) {
      throw new Error("Missing sim or storage attribute");
    }

    const products = await prisma.product.findMany({
      where: {
        deletedAt: null,
        OR: [
          { productAttributes: { some: { attributeId: { in: [simAttr.id, storageAttr.id] } } } },
          { attributeIds: { hasSome: [simAttr.id, storageAttr.id] } },
        ],
      },
      select: {
        id: true,
        attributeIds: true,
        productAttributes: {
          where: { attributeId: { in: [simAttr.id, storageAttr.id] } },
          select: { attributeId: true },
        },
        translations: {
          where: { locale: "en" },
          select: { slug: true, title: true },
          take: 1,
        },
        variants: {
          select: {
            id: true,
            sku: true,
            attributes: true,
            media: true,
            options: {
              select: { attributeKey: true, value: true, valueId: true },
            },
          },
        },
      },
    });

    const rows = [];

    for (const product of products) {
      const linkedIds = new Set([
        ...product.attributeIds,
        ...product.productAttributes.map((pa) => pa.attributeId),
      ]);
      const needsSim = linkedIds.has(simAttr.id);
      const needsStorage = linkedIds.has(storageAttr.id);
      const slug = product.translations[0]?.slug || product.id;

      for (const variant of product.variants) {
        // Admin edit needs relational options (valueId). JSONB-only is not enough.
        const hasSim = hasOption(variant.options, ["sim", "esim", "eSIM", "e_sim"]);
        const hasStorage = hasOption(variant.options, ["storage", "memory"]);

        if ((!needsSim || hasSim) && (!needsStorage || hasStorage)) {
          continue;
        }

        const recovered = recoverSimStorageFromEvidence({
          attributes: variant.attributes,
          media: variant.media,
          name: product.translations[0]?.title || null,
        });

        const row = {
          productId: product.id,
          product: slug,
          variantId: variant.id,
          sku: variant.sku,
          needsSim,
          needsStorage,
          hasSim,
          hasStorage,
          recoveredSim: recovered.sim,
          recoveredStorage: recovered.storage,
          simAction: "skip",
          storageAction: "skip",
        };

        if (needsSim && !hasSim && recovered.sim) {
          const result = await syncCatalogVariantSim(prisma, {
            productId: product.id,
            variantId: variant.id,
            attributes: variant.attributes,
            simLabel: recovered.sim,
            apply: APPLY,
          });
          row.simAction = result.variantOptionAction || result.status;
          if (APPLY && result.status === "ok") {
            variant.attributes = {
              ...(typeof variant.attributes === "object" && variant.attributes
                ? variant.attributes
                : {}),
              sim: recovered.sim,
            };
          }
        }

        if (needsStorage && !hasStorage && recovered.storage) {
          const result = await syncCatalogVariantStorage(prisma, {
            productId: product.id,
            variantId: variant.id,
            attributes: variant.attributes,
            storageLabel: recovered.storage,
            apply: APPLY,
          });
          row.storageAction = result.variantOptionAction || result.status;
        }

        if (
          row.simAction !== "skip" ||
          row.storageAction !== "skip" ||
          (needsSim && !hasSim) ||
          (needsStorage && !hasStorage)
        ) {
          rows.push(row);
        }
      }
    }

    const summary = {
      products_scanned: products.length,
      incomplete_variants: rows.length,
      sim_to_create: rows.filter((r) => r.simAction === "create").length,
      storage_to_create: rows.filter((r) => r.storageAction === "create").length,
      unresolved: rows.filter(
        (r) =>
          (r.needsSim && !r.hasSim && !r.recoveredSim) ||
          (r.needsStorage && !r.hasStorage && !r.recoveredStorage),
      ).length,
    };

    fs.mkdirSync(OUT_DIR, { recursive: true });
    const outFile = path.join(OUT_DIR, "backfill-missing-sim-storage-from-media.json");
    fs.writeFileSync(outFile, JSON.stringify({ summary, rows }, null, 2), "utf8");
    console.log(JSON.stringify(summary, null, 2));
    console.log(`Wrote ${outFile}`);

    if (APPLY) {
      const productIds = [...new Set(rows.map((r) => r.productId))];
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
