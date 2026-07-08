#!/usr/bin/env node
"use strict";

/**
 * Backfill configurable YerevanMobile variants for an existing product.
 * Parses Magento jsonConfig (color / storage) when swatches are missing.
 *
 * Usage:
 *   node scripts/product-import/maintenance/backfill-yerevanmobile-configurable-variants.cjs --slug samsung-galaxy-s25-edge --dry-run
 *   node scripts/product-import/maintenance/backfill-yerevanmobile-configurable-variants.cjs --slug samsung-galaxy-s25-edge --apply
 */

const path = require("path");
const fs = require("fs");
const { fetchHtml } = require("../pipelines/apple/http.cjs");
const { parseJsonConfigVariants } = require("../shared/yerevanmobile-json-config.cjs");

const ROOT = path.join(__dirname, "../../..");
const AMD_RATE = 400;
const DEFAULT_STOCK = 10;
const SOURCE = "yerevanmobile";
const DEFAULT_URL = "https://www.yerevanmobile.am/en/samsung-galaxy-s25-edge.html";

function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
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

function parseArgs(argv) {
  const args = new Set(argv);
  const slugIdx = argv.indexOf("--slug");
  const urlIdx = argv.indexOf("--url");
  return {
    apply: args.has("--apply"),
    dryRun: !args.has("--apply"),
    slug: slugIdx >= 0 ? argv[slugIdx + 1] : "samsung-galaxy-s25-edge",
    sourceUrl: urlIdx >= 0 ? argv[urlIdx + 1] : DEFAULT_URL,
  };
}

function parseSku(html) {
  const skuMatch = html.match(/itemprop="sku"[^>]*content="([^"]+)"/i);
  return skuMatch ? skuMatch[1] : null;
}

function parseTitle(html) {
  const h1 = html.match(/<h1[^>]*class="[^"]*page-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return h1[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const h1b = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return h1b ? h1b[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : null;
}

async function fetchSourceVariants(sourceUrl) {
  const { text, status } = await fetchHtml(sourceUrl, { sleepMs: 150 });
  if (status >= 400 || text.length < 800) {
    throw new Error(`Failed to fetch source page (${status})`);
  }

  const title = parseTitle(text) || "Product";
  const pageSku = parseSku(text);
  const variants = parseJsonConfigVariants(text, title, sourceUrl, pageSku);
  if (!variants.length) {
    throw new Error("No jsonConfig variants found on source page");
  }

  return { title, pageSku, variants, sourceUrl };
}

async function main() {
  loadEnv();
  const { apply, dryRun, slug, sourceUrl } = parseArgs(process.argv.slice(2));
  const { PrismaClient } = require("../../../shared/db/generated/client");
  const prisma = new PrismaClient();

  try {
    const translation = await prisma.productTranslation.findFirst({
      where: { slug, locale: "en" },
      include: {
        product: {
          include: {
            variants: { orderBy: { createdAt: "asc" } },
          },
        },
      },
    });

    if (!translation?.product) {
      throw new Error(`Product not found for slug: ${slug}`);
    }

    const product = translation.product;
    const { title, variants, sourceUrl: resolvedUrl } = await fetchSourceVariants(sourceUrl);

    const plan = {
      mode: dryRun ? "dry-run" : "apply",
      slug,
      productId: product.id,
      productTitle: translation.title,
      sourceUrl: resolvedUrl,
      existingVariants: product.variants.length,
      parsedVariants: variants.map((variant) => ({
        source_pid: variant.source_pid,
        sku: variant.sku,
        priceAmd: variant.price,
        priceUsd: Math.round((Number(variant.price) / AMD_RATE) * 100) / 100,
        options: variant.options,
      })),
    };

    console.log(JSON.stringify(plan, null, 2));

    if (dryRun) {
      console.log("\nDry-run only. Re-run with --apply to write changes.");
      return;
    }

    const sharedMedia = product.variants.find((v) => Array.isArray(v.media) && v.media.length)?.media
      || product.media
      || [];
    const sharedImageUrl = product.variants.find((v) => v.imageUrl)?.imageUrl || null;

    await prisma.$transaction(async (tx) => {
      for (const existing of product.variants) {
        const [cartCount, orderCount] = await Promise.all([
          tx.cartItem.count({ where: { variantId: existing.id } }),
          tx.orderItem.count({ where: { variantId: existing.id } }),
        ]);
        if (cartCount > 0 || orderCount > 0) {
          throw new Error(`Variant ${existing.id} has cart/order references — aborting`);
        }
        await tx.productVariant.delete({ where: { id: existing.id } });
      }

      for (const [index, variant] of variants.entries()) {
        const price = Math.round((Number(variant.price) / AMD_RATE) * 100) / 100;
        const variantMedia = variant.image_url
          ? [{ url: variant.image_url, alt: title }]
          : sharedMedia;
        await tx.productVariant.create({
          data: {
            productId: product.id,
            sku: variant.sku,
            price,
            priceOnRequest: false,
            stock: DEFAULT_STOCK,
            imageUrl: variant.image_url || sharedImageUrl,
            media: variantMedia,
            position: index,
            published: true,
            source: SOURCE,
            sourcePid: String(variant.source_pid),
            sourceUrl: resolvedUrl,
            attributes: variant.options,
          },
        });
      }

      if (Array.isArray(sharedMedia) && sharedMedia.length > 0) {
        await tx.product.update({
          where: { id: product.id },
          data: { media: sharedMedia },
        });
      }
    });

    console.log(`\nApplied ${variants.length} variants for ${title}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("FATAL:", error.message);
  process.exit(1);
});
