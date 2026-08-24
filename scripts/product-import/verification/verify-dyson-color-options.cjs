#!/usr/bin/env node
/**
 * Read-only verification of Dyson relational color options.
 *
 * Usage:
 *   node scripts/product-import/verification/verify-dyson-color-options.cjs
 *
 * Exit 0 when all resolved Dyson colors pass.
 * manual_review / skip_no_color reported separately.
 */

"use strict";

const path = require("path");
const fs = require("fs");

const ROOT = path.join(__dirname, "../../..");
const OUT_DIR = path.join(ROOT, "audit/product-import/device");

const {
  normalizeColorKey,
  recoverDysonColorFromEvidence,
} = require("../shared/dyson-color-registry.cjs");

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

async function main() {
  const { PrismaClient } = require(path.join(ROOT, "shared/db/generated/client"));
  const prisma = new PrismaClient();

  try {
    const brand = await prisma.brand.findFirst({ where: { slug: "dyson" } });
    if (!brand) {
      console.error("Dyson brand not found");
      process.exit(1);
    }

    const appleBrand = await prisma.brand.findFirst({ where: { slug: "apple" } });
    const samsungBrand = await prisma.brand.findFirst({ where: { slug: "samsung" } });

    const colorAttr = await prisma.attribute.findUnique({ where: { key: "color" } });
    const allColorValues = colorAttr
      ? await prisma.attributeValue.findMany({
          where: { attributeId: colorAttr.id },
          include: { translations: true },
        })
      : [];

    const products = await prisma.product.findMany({
      where: { brandId: brand.id, deletedAt: null },
      include: {
        translations: { where: { locale: "en" }, select: { title: true, slug: true } },
        variants: {
          include: {
            options: {
              include: { attributeValue: true },
            },
          },
        },
      },
    });

    const rows = [];
    let fail = 0;
    let pass = 0;
    let skip = 0;
    let manual = 0;

    for (const product of products) {
      const slug = product.translations[0]?.slug || product.id;
      for (const variant of product.variants) {
        const attrs =
          variant.attributes && typeof variant.attributes === "object" && !Array.isArray(variant.attributes)
            ? variant.attributes
            : {};
        const attrColor = pickRawColor(attrs);
        const mediaAlt = firstMediaAlt(variant.media);
        const recovered = recoverDysonColorFromEvidence({
          rawColor: attrColor,
          sku: variant.sku,
          sourceUrl: variant.sourceUrl,
          mediaAlt,
          title: product.translations[0]?.title,
        });

        const colorOpts = variant.options.filter(
          (o) => o.attributeKey === "color" || o.attributeKey === "colour",
        );

        if (recovered.status === "empty") {
          skip += 1;
          rows.push({
            product: slug,
            variant: variant.sku || variant.id,
            color: attrColor,
            optionLinked: colorOpts.length > 0,
            attributeValue: null,
            hexColors: null,
            result: "skip_no_color",
          });
          continue;
        }

        if (recovered.status === "manual_review") {
          manual += 1;
          rows.push({
            product: slug,
            variant: variant.sku || variant.id,
            color: attrColor,
            optionLinked: colorOpts.length > 0,
            attributeValue: null,
            hexColors: null,
            result: `manual_review:${recovered.reason}`,
          });
          continue;
        }

        const expected = recovered.entry.canonicalName;
        const opt = colorOpts[0];
        const av = opt?.attributeValue || null;
        const colors = Array.isArray(av?.colors) ? av.colors.map(String) : [];
        const linked = Boolean(opt && opt.valueId && av);
        const attrsMatch =
          attrColor != null && normalizeColorKey(attrColor) === normalizeColorKey(expected);
        const noGray = colors.length > 0 && !colors.some((c) => c.toUpperCase() === "#CCCCCC");
        const valueMatches =
          opt &&
          normalizeColorKey(opt.value || "") === normalizeColorKey(expected) &&
          normalizeColorKey(av.value) === normalizeColorKey(expected);

        let result = "PASS";
        if (!linked) result = "FAIL_no_option_link";
        else if (!colors.length) result = "FAIL_empty_colors";
        else if (!noGray) result = "FAIL_gray_hex";
        else if (!valueMatches) result = "FAIL_value_mismatch";
        else if (!attrsMatch) result = "FAIL_attributes_mismatch";
        else if (colorOpts.length > 1) result = "FAIL_duplicate_options";

        if (result === "PASS") pass += 1;
        else fail += 1;

        rows.push({
          product: slug,
          variant: variant.sku || variant.id,
          color: expected,
          optionLinked: linked,
          attributeValue: av?.value || null,
          hexColors: colors,
          result,
        });
      }
    }

    // Duplicate Dyson AttributeValues by normalized canonical name
    const dysonCanonicalKeys = new Set(
      rows.filter((r) => r.result === "PASS").map((r) => normalizeColorKey(r.color)),
    );
    const dupReport = [];
    for (const key of dysonCanonicalKeys) {
      const matches = allColorValues.filter((av) => normalizeColorKey(av.value) === key);
      if (matches.length > 1) {
        dupReport.push({ key, ids: matches.map((m) => m.id), count: matches.length });
      }
    }

    // Non-Dyson: we only assert we didn't wipe options (count > 0 still present if brands exist)
    const appleColorOpts = appleBrand
      ? await prisma.productVariantOption.count({
          where: { attributeKey: "color", variant: { product: { brandId: appleBrand.id } } },
        })
      : null;
    const samsungColorOpts = samsungBrand
      ? await prisma.productVariantOption.count({
          where: { attributeKey: "color", variant: { product: { brandId: samsungBrand.id } } },
        })
      : null;

    const summary = {
      pass,
      fail,
      skip_no_color: skip,
      manual_review: manual,
      duplicate_attribute_values: dupReport,
      apple_color_options: appleColorOpts,
      samsung_color_options: samsungColorOpts,
    };

    fs.mkdirSync(OUT_DIR, { recursive: true });
    const mdPath = path.join(OUT_DIR, "dyson-color-verification-report.md");
    const lines = [
      "# Dyson Color Verification Report",
      "",
      `Generated: ${new Date().toISOString()}`,
      "",
      "## Summary",
      "",
      "```json",
      JSON.stringify(summary, null, 2),
      "```",
      "",
      "| Product | Variant | Color | Option linked | AttributeValue | HEX colors | Result |",
      "| --- | --- | --- | --- | --- | --- | --- |",
    ];
    for (const r of rows) {
      lines.push(
        `| ${r.product} | ${r.variant} | ${r.color ?? ""} | ${r.optionLinked} | ${r.attributeValue ?? ""} | ${JSON.stringify(r.hexColors ?? [])} | ${r.result} |`,
      );
    }
    fs.writeFileSync(mdPath, lines.join("\n"), "utf8");
    fs.writeFileSync(
      path.join(OUT_DIR, "dyson-color-verification.json"),
      JSON.stringify({ summary, rows, duplicate_attribute_values: dupReport }, null, 2),
      "utf8",
    );

    console.log(JSON.stringify(summary, null, 2));
    console.log(`Wrote ${mdPath}`);

    if (fail > 0 || dupReport.length > 0) {
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
