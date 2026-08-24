#!/usr/bin/env node
/** Read-only FK and orphan constraint audit */
"use strict";
const path = require("path");
const fs = require("fs");

function loadEnv(fp) {
  if (!fs.existsSync(fp)) return;
  for (const line of fs.readFileSync(fp, "utf8").split("\n")) {
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
loadEnv(path.join(__dirname, "../.env"));
const { PrismaClient } = require("../shared/db/generated/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== FK CONSTRAINTS ===");
  const fkCount = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS fk_count
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'
  `;
  console.log("Total FK constraints in public schema:", fkCount);

  const productVariantFk = await prisma.$queryRaw`
    SELECT tc.constraint_name, tc.table_name, kcu.column_name,
           ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = 'product_variants'
  `;
  console.log("\nproduct_variants FK:", JSON.stringify(productVariantFk, null, 2));

  const orphan = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS orphan_variants
    FROM product_variants v
    LEFT JOIN products p ON p.id = v."productId"
    WHERE p.id IS NULL
  `;
  console.log("\n=== ORPHAN COUNT ===");
  console.log(orphan);

  const productsNoVariants = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM products p
    LEFT JOIN product_variants v ON v."productId" = p.id
    WHERE v.id IS NULL
  `;
  console.log("\n=== PRODUCTS WITHOUT VARIANTS ===");
  console.log(productsNoVariants);

  const variantsNoProduct = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM product_variants v
    LEFT JOIN products p ON p.id = v."productId"
    WHERE p.id IS NULL
  `;
  console.log("\n=== VARIANTS WITHOUT PRODUCT ===");
  console.log(variantsNoProduct);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
