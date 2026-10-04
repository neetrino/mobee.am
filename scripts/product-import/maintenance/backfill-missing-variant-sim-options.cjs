#!/usr/bin/env node
/**
 * Backfill ProductVariantOption (sim) so admin product edit can resolve valueIds.
 * Also ensures SIM AttributeValue rows exist for values used on products.
 *
 * Usage:
 *   node scripts/product-import/maintenance/backfill-missing-variant-sim-options.cjs
 *   node scripts/product-import/maintenance/backfill-missing-variant-sim-options.cjs --apply --confirm-catalog-sim
 *
 * Default: dry-run
 */

"use strict";

const path = require("path");
const fs = require("fs");

const ROOT = path.join(__dirname, "../../..");
const OUT_DIR = path.join(ROOT, "audit/product-import");
const { syncCatalogVariantSim } = require("../shared/catalog-sim-variant-sync.cjs");
const {
  extractSimFromAttributes,
  ensureSimAttribute,
  normalizeSimLabel,
} = require("../shared/catalog-sim-attribute-sync.cjs");

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
const CONFIRMED = process.argv.includes("--confirm-catalog-sim");

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
    sim_ok: rows.filter((row) => row.status === "ok").length,
    skip_no_sim: rows.filter((row) => row.status === "skip_no_sim").length,
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

function optionSelect(simAttributeId, simValueIds) {
  return {
    where: {
      OR: [
        { attributeKey: "sim" },
        { attributeKey: "esim" },
        { attributeKey: "eSIM" },
        { attributeKey: "e_sim" },
        ...(simValueIds.length > 0 ? [{ valueId: { in: simValueIds } }] : []),
        { attributeId: simAttributeId },
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

async function loadVariantsWithSimSignal(prisma, simAttributeId, simValueIds) {
  const optionsFilter = optionSelect(simAttributeId, simValueIds);

  const relational = await prisma.productVariant.findMany({
    where: {
      product: { deletedAt: null },
      OR: [
        { options: { some: { attributeKey: "sim" } } },
        { options: { some: { attributeKey: "esim" } } },
        { options: { some: { attributeKey: "eSIM" } } },
        ...(simValueIds.length > 0
          ? [{ options: { some: { valueId: { in: simValueIds } } } }]
          : []),
        { options: { some: { attributeId: simAttributeId } } },
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
        (v.attributes ? 'sim' AND NULLIF(BTRIM(v.attributes->>'sim'), '') IS NOT NULL)
        OR (v.attributes ? 'esim' AND NULLIF(BTRIM(v.attributes->>'esim'), '') IS NOT NULL)
      )
      AND NOT EXISTS (
        SELECT 1 FROM product_variant_options o
        WHERE o."variantId" = v.id
          AND (
            o."attributeKey" IN ('sim', 'esim', 'eSIM', 'e_sim')
            OR o."attributeId" = ${simAttributeId}
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

function resolveSimLabel(variant) {
  const fromOption = variant.options.find((opt) => opt.value)?.value;
  return normalizeSimLabel(fromOption) || extractSimFromAttributes(variant.attributes);
}

function toRow(variant, syncResult, simLabel) {
  const translation = variant.product.translations[0];
  return {
    productId: variant.productId,
    product: translation?.slug || variant.productId,
    title: translation?.title || null,
    variantId: variant.id,
    sku: variant.sku,
    simLabel,
    status: syncResult.status,
    attributeValueAction: syncResult.attributeValueAction || "none",
    variantOptionAction: syncResult.variantOptionAction || "none",
    productAttributeAction: syncResult.productAttributeAction || "none",
    reason: syncResult.reason || null,
  };
}

async function main() {
  console.log("=== Backfill missing variant SIM options ===");
  console.log(APPLY ? "MODE: APPLY" : "MODE: DRY-RUN");

  if (APPLY && !CONFIRMED) {
    console.error("Refuse apply without --confirm-catalog-sim");
    process.exit(1);
  }

  const { PrismaClient } = require(path.join(ROOT, "shared/db/generated/client"));
  const prisma = new PrismaClient();

  try {
    const simAttr = await ensureSimAttribute(prisma);
    const simValues = await prisma.attributeValue.findMany({
      where: { attributeId: simAttr.id },
      select: { id: true },
    });
    const simValueIds = simValues.map((value) => value.id);

    const variants = await loadVariantsWithSimSignal(prisma, simAttr.id, simValueIds);
    const rows = [];

    for (const variant of variants) {
      const simLabel = resolveSimLabel(variant);
      const syncResult = await syncCatalogVariantSim(prisma, {
        productId: variant.productId,
        variantId: variant.id,
        attributes: variant.attributes,
        simLabel,
        apply: APPLY,
      });
      rows.push(toRow(variant, syncResult, simLabel));
    }

    const summary = summarize(rows);
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const outFile = path.join(OUT_DIR, "backfill-missing-variant-sim-options.json");
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
