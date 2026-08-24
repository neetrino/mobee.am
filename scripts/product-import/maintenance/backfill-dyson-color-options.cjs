#!/usr/bin/env node
/**
 * Backfill Dyson ProductVariantOption + AttributeValue.colors for color swatches.
 *
 * Usage:
 *   node scripts/product-import/maintenance/backfill-dyson-color-options.cjs --dry-run
 *   node scripts/product-import/maintenance/backfill-dyson-color-options.cjs --apply --confirm-dyson-colors
 *
 * Default: --dry-run
 * Scope: brand.slug = dyson only
 */

"use strict";

const path = require("path");
const fs = require("fs");

const ROOT = path.join(__dirname, "../../..");
const OUT_DIR = path.join(ROOT, "audit/product-import/device");

const {
  recoverDysonColorFromEvidence,
  listDysonColorRegistry,
  normalizeColorKey,
} = require("../shared/dyson-color-registry.cjs");
const {
  ensureColorAttribute,
  ensureDysonAttributeValue,
  ensureDysonVariantColorOption,
  ensureDysonProductAttribute,
  mergeAttributesColor,
} = require("../shared/dyson-color-attribute-sync.cjs");

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

const APPLY = process.argv.includes("--apply");
const DRY_RUN = !APPLY || process.argv.includes("--dry-run");
const CONFIRMED = process.argv.includes("--confirm-dyson-colors");

function pickRawColor(attributes) {
  if (!attributes || typeof attributes !== "object") return null;
  const c = attributes.color ?? attributes.Colour ?? attributes.colour;
  if (Array.isArray(c)) return c[0] ?? null;
  if (typeof c === "string") return c;
  return null;
}

function firstMediaAlt(media) {
  if (!Array.isArray(media) || !media.length) return null;
  const first = media[0];
  if (first && typeof first === "object" && first.alt) return String(first.alt);
  return null;
}

function summarize(rows) {
  const summary = {
    dyson_products_scanned: new Set(rows.map((r) => r.productId)).size,
    dyson_variants_scanned: rows.length,
    colors_found: rows.filter((r) => r.status !== "skip_no_color").length,
    colors_resolved: rows.filter((r) => r.status === "ok").length,
    colors_manual_review: rows.filter((r) => r.status === "manual_review").length,
    skip_no_color: rows.filter((r) => r.status === "skip_no_color").length,
    attribute_values_to_create: rows.filter((r) => r.attributeValueAction === "create").length,
    attribute_values_to_reuse: rows.filter((r) => r.attributeValueAction === "reuse").length,
    attribute_values_to_update: rows.filter((r) => r.attributeValueAction === "update").length,
    variant_options_to_create: rows.filter((r) => r.variantOptionAction === "create").length,
    variant_options_to_update: rows.filter((r) => r.variantOptionAction === "update").length,
    product_attributes_to_create: rows.filter((r) => r.productAttributeAction === "create").length,
    duplicate_risks: rows.filter((r) => r.duplicateRisk).length,
    non_dyson_touched: 0,
    blocked: false,
    block_reasons: [],
  };
  return summary;
}

async function main() {
  if (APPLY && DRY_RUN) {
    // --apply alone means apply; --dry-run with --apply still dry-run unless we clarify.
  }
  const modeApply = APPLY && !process.argv.includes("--dry-run");

  console.log("=== Backfill Dyson color options ===");
  console.log(modeApply ? "MODE: APPLY" : "MODE: DRY-RUN");

  if (modeApply && !CONFIRMED) {
    console.error("Refuse apply without --confirm-dyson-colors");
    process.exit(1);
  }

  const { PrismaClient } = require(path.join(ROOT, "shared/db/generated/client"));
  const prisma = new PrismaClient();

  try {
    const brand = await prisma.brand.findFirst({ where: { slug: "dyson" } });
    if (!brand) {
      console.error("Dyson brand not found");
      process.exit(1);
    }

    // Safety: count non-Dyson before/after timestamps only for reporting baseline.
    const appleBrand = await prisma.brand.findFirst({ where: { slug: "apple" } });
    const samsungBrand = await prisma.brand.findFirst({ where: { slug: "samsung" } });
    const appleOptionBaseline =
      appleBrand
        ? await prisma.productVariantOption.count({
            where: { variant: { product: { brandId: appleBrand.id } }, attributeKey: "color" },
          })
        : null;
    const samsungOptionBaseline =
      samsungBrand
        ? await prisma.productVariantOption.count({
            where: { variant: { product: { brandId: samsungBrand.id } }, attributeKey: "color" },
          })
        : null;

    const products = await prisma.product.findMany({
      where: { brandId: brand.id, deletedAt: null },
      include: {
        translations: { where: { locale: "en" }, select: { title: true, slug: true } },
        variants: { include: { options: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const colorAttr = await ensureColorAttribute(prisma);
    const rows = [];
    /** @type {Map<string, object>} */
    const avPlanByCanonical = new Map();

    for (const product of products) {
      const productSlug = product.translations[0]?.slug || product.id;
      const productTitle = product.translations[0]?.title || productSlug;

      for (const variant of product.variants) {
        const attrs =
          variant.attributes && typeof variant.attributes === "object" && !Array.isArray(variant.attributes)
            ? variant.attributes
            : {};
        const rawColor = pickRawColor(attrs);
        const mediaAlt = firstMediaAlt(variant.media);

        const resolved = recoverDysonColorFromEvidence({
          rawColor,
          sku: variant.sku,
          sourceUrl: variant.sourceUrl,
          mediaAlt,
          title: productTitle,
        });

        if (resolved.status === "empty") {
          rows.push({
            productId: product.id,
            product: productSlug,
            variantId: variant.id,
            variant: variant.sku || variant.id,
            currentColor: rawColor,
            canonicalColor: null,
            primaryHex: null,
            secondaryHex: null,
            attributeValueAction: "none",
            variantOptionAction: "none",
            productAttributeAction: "none",
            status: "skip_no_color",
            reason: "no_color_in_attributes_or_evidence",
            duplicateRisk: false,
          });
          continue;
        }

        if (resolved.status === "manual_review") {
          rows.push({
            productId: product.id,
            product: productSlug,
            variantId: variant.id,
            variant: variant.sku || variant.id,
            currentColor: rawColor,
            canonicalColor: null,
            primaryHex: null,
            secondaryHex: null,
            attributeValueAction: "none",
            variantOptionAction: "none",
            productAttributeAction: "none",
            status: "manual_review",
            reason: resolved.reason,
            duplicateRisk: false,
          });
          continue;
        }

        const entry = resolved.entry;
        const primaryHex = entry.colors[0] || null;
        const secondaryHex = entry.colors[1] || null;

        if (!avPlanByCanonical.has(entry.canonicalName)) {
          const avResult = await ensureDysonAttributeValue(prisma, colorAttr.id, entry, {
            apply: modeApply,
          });
          avPlanByCanonical.set(entry.canonicalName, avResult);
        }
        const avResult = avPlanByCanonical.get(entry.canonicalName);

        // On dry-run, attributeValueId may be null for create — use placeholder for option plan.
        let attributeValueId = avResult.attributeValueId;
        if (modeApply && !attributeValueId) {
          throw new Error(`Missing AttributeValue id after apply for ${entry.canonicalName}`);
        }

        const optionResult = attributeValueId
          ? await ensureDysonVariantColorOption(prisma, {
              variantId: variant.id,
              attributeId: colorAttr.id,
              attributeValueId,
              canonicalName: entry.canonicalName,
              apply: modeApply,
            })
          : {
              action: "create",
              optionId: null,
              note: "depends_on_attribute_value_create",
            };

        if (optionResult.action === "manual_review") {
          rows.push({
            productId: product.id,
            product: productSlug,
            variantId: variant.id,
            variant: variant.sku || variant.id,
            currentColor: rawColor,
            canonicalColor: entry.canonicalName,
            primaryHex,
            secondaryHex,
            attributeValueAction: avResult.action,
            variantOptionAction: "manual_review",
            productAttributeAction: "none",
            status: "manual_review",
            reason: optionResult.reason,
            duplicateRisk: Boolean(avResult.duplicateRisk),
          });
          continue;
        }

        const paResult = await ensureDysonProductAttribute(
          prisma,
          product.id,
          colorAttr.id,
          modeApply,
        );

        if (modeApply) {
          const nextAttrs = mergeAttributesColor(attrs, entry.canonicalName);
          // Preserve other keys; only sync color name.
          await prisma.productVariant.update({
            where: { id: variant.id },
            data: { attributes: nextAttrs },
          });
        }

        rows.push({
          productId: product.id,
          product: productSlug,
          variantId: variant.id,
          variant: variant.sku || variant.id,
          currentColor: rawColor,
          canonicalColor: entry.canonicalName,
          primaryHex,
          secondaryHex,
          attributeValueAction: avResult.action,
          variantOptionAction: optionResult.action,
          productAttributeAction: paResult.action,
          status: "ok",
          recoveredFrom: resolved.recoveredFrom || null,
          duplicateRisk: Boolean(avResult.duplicateRisk),
          attributeValueId: attributeValueId || null,
        });
      }
    }

    const summary = summarize(rows);

    // Gate: unknown silent gray
    const grayMapped = rows.filter(
      (r) =>
        r.primaryHex &&
        (normalizeColorKey(r.primaryHex) === "cccccc" || String(r.primaryHex).toUpperCase() === "#CCCCCC"),
    );
    if (grayMapped.length) {
      summary.blocked = true;
      summary.block_reasons.push("gray_hex_in_registry_output");
    }

    // Gate: duplicate AttributeValues would be created for same canonical — checked in sync
    const multiDup = rows.filter((r) => r.duplicateRisk && r.attributeValueAction === "create");
    if (multiDup.length) {
      summary.blocked = true;
      summary.block_reasons.push("duplicate_attribute_value_create_risk");
    }

    // Post-apply safety: Apple/Samsung option counts unchanged
    if (modeApply) {
      const appleAfter =
        appleBrand
          ? await prisma.productVariantOption.count({
              where: { variant: { product: { brandId: appleBrand.id } }, attributeKey: "color" },
            })
          : null;
      const samsungAfter =
        samsungBrand
          ? await prisma.productVariantOption.count({
              where: { variant: { product: { brandId: samsungBrand.id } }, attributeKey: "color" },
            })
          : null;
      if (appleBaselineChanged(appleOptionBaseline, appleAfter)) {
        summary.blocked = true;
        summary.block_reasons.push("apple_color_options_changed");
        summary.non_dyson_touched += 1;
      }
      if (appleBaselineChanged(samsungOptionBaseline, samsungAfter)) {
        summary.blocked = true;
        summary.block_reasons.push("samsung_color_options_changed");
        summary.non_dyson_touched += 1;
      }
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });
    const payload = {
      mode: modeApply ? "apply" : "dry-run",
      generatedAt: new Date().toISOString(),
      brand: { id: brand.id, slug: brand.slug },
      registry: listDysonColorRegistry(),
      summary,
      rows,
    };

    const outFile = modeApply
      ? path.join(OUT_DIR, "dyson-color-backfill-result.json")
      : path.join(OUT_DIR, "dyson-color-backfill.dry-run.json");
    fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), "utf8");

    console.log("\nSummary:");
    console.log(JSON.stringify(summary, null, 2));
    console.log(`\nWrote ${outFile}`);

    console.log("\n| Product | Variant | Current color | Canonical color | Primary HEX | Secondary HEX | AttributeValue action | VariantOption action | Status |");
    console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
    for (const r of rows) {
      console.log(
        `| ${r.product} | ${r.variant} | ${r.currentColor ?? ""} | ${r.canonicalColor ?? ""} | ${r.primaryHex ?? ""} | ${r.secondaryHex ?? ""} | ${r.attributeValueAction} | ${r.variantOptionAction} | ${r.status}${r.reason ? ` (${r.reason})` : ""} |`,
      );
    }

    if (!modeApply && summary.blocked) {
      console.error("\nDRY-RUN BLOCKED — do not apply.");
      process.exit(2);
    }
    if (modeApply && summary.blocked) {
      console.error("\nAPPLY finished but safety gates failed — inspect immediately.");
      process.exit(2);
    }

    // For dry-run: manual_review rows are OK (documented) as long as no gray/dup/non-dyson.
    // Corrale skip_no_color is expected.
  } finally {
    await prisma.$disconnect();
  }
}

function appleBaselineChanged(before, after) {
  if (before == null || after == null) return false;
  return before !== after;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
