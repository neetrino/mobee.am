#!/usr/bin/env node
/**
 * Updates descriptions for already-imported mobilecentre products.
 * Run: node scripts/update-mobilecentre-descriptions.cjs
 */
const path = require("path");
const fs = require("fs");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  fs.readFileSync(filePath, "utf8").split("\n").forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return;
    const eq = t.indexOf("=");
    if (eq < 1) return;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  });
}
loadEnv(path.join(__dirname, "../../../.env"));

const { PrismaClient } = require("../../../shared/db/generated/client");
const { buildDescriptionHtml } = require("../shared/mobilecentre-description-html.cjs");
const prisma = new PrismaClient();

const PRODUCTS_JSON = path.join(__dirname, "../../../data/product-import/apple/mobilecentre_all_apple_products.json");

async function main() {
  console.log("=== Update MobileCentre descriptions ===");
  const products = JSON.parse(fs.readFileSync(PRODUCTS_JSON, "utf8"));

  let updated = 0;
  let notFound = 0;

  for (const raw of products) {
    const descHtml = buildDescriptionHtml(raw.description);
    if (!descHtml) { notFound++; continue; }

    const skuPattern = `mc-${raw.id}`;
    const variant = await prisma.productVariant.findUnique({ where: { sku: skuPattern } });
    if (!variant) { notFound++; continue; }

    await prisma.productTranslation.updateMany({
      where: { productId: variant.productId },
      data: { descriptionHtml: descHtml },
    });
    updated++;
    if (updated % 20 === 0) process.stdout.write(`\r  Updated: ${updated}/${products.length}`);
  }

  console.log(`\n  ✓ Updated: ${updated}, not found: ${notFound}`);
  console.log("=== Done ===");
}

main()
  .catch((err) => { console.error("\n❌", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
