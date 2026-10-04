#!/usr/bin/env node
/**
 * Backfill ProductVariantOption (storage) so admin product edit can resolve valueIds.
 * Also ensures Storage AttributeValue rows exist for values used on products.
 *
 * Usage:
 *   node scripts/product-import/maintenance/backfill-missing-variant-storage-options.cjs
 *   node scripts/product-import/maintenance/backfill-missing-variant-storage-options.cjs --apply --confirm-catalog-storage
 *
 * Default: dry-run
 */

"use strict";

const path = require("path");
const fs = require("fs");

const ROOT = path.join(__dirname, "../../..");
const OUT_DIR = path.join(ROOT, "audit/product-import");
const { syncCatalogVariantStorage } = require("../shared/catalog-storage-variant-sync.cjs");
const {
  extractStorageFromAttributes,
  ensureStorageAttribute,
  normalizeStorageLabel,
} = require("../shared/catalog-storage-attribute-sync.cjs");

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
const CONFIRMED = process.argv.includes("--confirm-catalog-storage");

const VARIANT_SELECT = {
  id: true,
  sku: true,
  attributes: true,
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
};

function summarize(rows) {
  return {
    variants_scanned: rows.length,
    storage_ok: rows.filter((row) => row.status === "ok").length,
    skip_no_storage: rows.filter((row) => row.status === "skip_no_storage").length,
    manual_review: rows.filter((row) => row.status === "manual_review").length,
    attribute_values_to_create: rows.filter((row) => row.attributeValueAction === "create")
      .length,
    options_to_create: rows.filter((row) => row.variantOptionAction === "create").length,
    options_to_update: rows.filter((row) => row.variantOptionAction === "update").length,
    product_attributes_to_create: rows.filter(
      (row) => row.productAttributeAction === "create",
    ).length,
  };
}

function optionSelect(storageAttributeId, storageValueIds) {
  return {
    where: {
      OR: [
        { attributeKey: "storage" },
        { attributeKey: "memory" },
        ...(storageValueIds.length > 0
          ? [{ valueId: { in: storageValueIds } }]
          : []),
        { attributeId: storageAttributeId },
      ],
    },
    select: {
      id: true,
      attributeKey: true,
      attributeId: true,
      valueId: true,
      value: true,
    },
  };
}

async function loadVariantsWithStorageSignal(prisma, storageAttributeId, storageValueIds) {
  const optionsFilter = optionSelect(storageAttributeId, storageValueIds);

  const relational = await prisma.productVariant.findMany({
    where: {
      product: { deletedAt: null },
      OR: [
        { options: { some: { attributeKey: "storage" } } },
        { options: { some: { attributeKey: "memory" } } },
        ...(storageValueIds.length > 0
          ? [{ options: { some: { valueId: { in: storageValueIds } } } }]
          : []),
        { options: { some: { attributeId: storageAttributeId } } },
      ],
    },
    select: {
      ...VARIANT_SELECT,
      options: optionsFilter,
    },
    orderBy: { createdAt: "asc" },
  });

  const jsonbOnlyIds = await prisma.$queryRaw`
    SELECT v.id
    FROM product_variants v
    INNER JOIN products p ON p.id = v."productId"
    WHERE p."deletedAt" IS NULL
      AND (
        (v.attributes ? 'storage' AND NULLIF(BTRIM(v.attributes->>'storage'), '') IS NOT NULL)
        OR (v.attributes ? 'memory' AND NULLIF(BTRIM(v.attributes->>'memory'), '') IS NOT NULL)
      )
      AND NOT EXISTS (
        SELECT 1 FROM product_variant_options o
        WHERE o."variantId" = v.id
          AND (
            o."attributeKey" IN ('storage', 'memory')
            OR o."attributeId" = ${storageAttributeId}
          )
      )
  `;

  const missingIds = jsonbOnlyIds.map((row) => row.id).filter(Boolean);
  if (missingIds.length === 0) return relational;

  const jsonbVariants = await prisma.productVariant.findMany({
    where: { id: { in: missingIds } },
    select: {
      ...VARIANT_SELECT,
      options: optionsFilter,
    },
  });

  const byId = new Map();
  for (const variant of [...relational, ...jsonbVariants]) {
    byId.set(variant.id, variant);
  }
  return [...byId.values()];
}

function resolveStorageLabel(variant) {
  const fromOption = variant.options.find((opt) => opt.value)?.value;
  return (
    normalizeStorageLabel(fromOption) ||
    extractStorageFromAttributes(variant.attributes)
  );
}

function toRow(variant, syncResult, storageLabel) {
  const translation = variant.product.translations[0];
  return {
    productId: variant.productId,
    product: translation?.slug || variant.productId,
    title: translation?.title || null,
    variantId: variant.id,
    sku: variant.sku,
    storageLabel,
    status: syncResult.status,
    attributeValueAction: syncResult.attributeValueAction || "none",
    variantOptionAction: syncResult.variantOptionAction || "none",
    productAttributeAction: syncResult.productAttributeAction || "none",
    reason: syncResult.reason || null,
  };
}

async function main() {
  console.log("=== Backfill missing variant storage options ===");
  console.log(APPLY ? "MODE: APPLY" : "MODE: DRY-RUN");

  if (APPLY && !CONFIRMED) {
    console.error("Refuse apply without --confirm-catalog-storage");
    process.exit(1);
  }

  const { PrismaClient } = require(path.join(ROOT, "shared/db/generated/client"));
  const prisma = new PrismaClient();

  try {
    const storageAttr = await ensureStorageAttribute(prisma);
    const storageValues = await prisma.attributeValue.findMany({
      where: { attributeId: storageAttr.id },
      select: { id: true },
    });
    const storageValueIds = storageValues.map((value) => value.id);

    const variants = await loadVariantsWithStorageSignal(
      prisma,
      storageAttr.id,
      storageValueIds,
    );
    const rows = [];

    for (const variant of variants) {
      const storageLabel = resolveStorageLabel(variant);
      const syncResult = await syncCatalogVariantStorage(prisma, {
        productId: variant.productId,
        variantId: variant.id,
        attributes: variant.attributes,
        storageLabel,
        apply: APPLY,
      });
      rows.push(toRow(variant, syncResult, storageLabel));
    }

    const summary = summarize(rows);
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const outFile = path.join(OUT_DIR, "backfill-missing-variant-storage-options.json");
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
                row.variantOptionAction === "update" ||
                row.productAttributeAction === "create" ||
                row.attributeValueAction === "create",
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
