"use strict";

/**
 * Backfill Product.warrantyYears:
 * - products with any variant.source = "marco" → 2 years
 * - all other non-deleted products → 1 year
 *
 * Usage:
 *   node scripts/backfill-product-warranty-years.cjs
 *   node scripts/backfill-product-warranty-years.cjs --apply
 */

const fs = require("fs");
const path = require("path");

function loadEnv(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
    if (!process.env[key]) process.env[key] = value;
  }
  return out;
}

loadEnv(path.join(process.cwd(), ".env"));

const { PrismaClient } = require(path.join(
  __dirname,
  "..",
  "shared",
  "db",
  "generated",
  "client",
));

const APPLY = process.argv.includes("--apply");
const MARCO_YEARS = 2;
const OTHER_YEARS = 1;

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.product.count({ where: { deletedAt: null } });

  const marcoRows = await prisma.productVariant.findMany({
    where: { source: "marco" },
    select: { productId: true },
    distinct: ["productId"],
  });
  const marcoIds = [...new Set(marcoRows.map((row) => row.productId))];

  const before = await prisma.product.groupBy({
    by: ["warrantyYears"],
    where: { deletedAt: null },
    _count: { _all: true },
  });

  console.log(
    JSON.stringify(
      {
        mode: APPLY ? "apply" : "dry-run",
        totalActiveProducts: total,
        marcoProducts: marcoIds.length,
        otherProducts: total - marcoIds.length,
        warrantyBefore: before.map((row) => ({
          warrantyYears: row.warrantyYears,
          count: row._count._all,
        })),
      },
      null,
      2,
    ),
  );

  if (!APPLY) {
    console.log("\nDry-run only. Re-run with --apply to write.");
    return;
  }

  const marcoResult =
    marcoIds.length > 0
      ? await prisma.product.updateMany({
          where: { id: { in: marcoIds }, deletedAt: null },
          data: { warrantyYears: MARCO_YEARS },
        })
      : { count: 0 };

  const otherResult = await prisma.product.updateMany({
    where: {
      deletedAt: null,
      ...(marcoIds.length > 0 ? { id: { notIn: marcoIds } } : {}),
    },
    data: { warrantyYears: OTHER_YEARS },
  });

  const after = await prisma.product.groupBy({
    by: ["warrantyYears"],
    where: { deletedAt: null },
    _count: { _all: true },
  });

  console.log(
    JSON.stringify(
      {
        updated: {
          marcoTo2Years: marcoResult.count,
          otherTo1Year: otherResult.count,
        },
        warrantyAfter: after.map((row) => ({
          warrantyYears: row.warrantyYears,
          count: row._count._all,
        })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
