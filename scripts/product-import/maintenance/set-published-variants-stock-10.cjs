#!/usr/bin/env node
"use strict";

const path = require("path");
const fs = require("fs");

function loadEnv() {
  const envPath = path.join(__dirname, "../../../.env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v[0] === '"' && v.at(-1) === '"') || (v[0] === "'" && v.at(-1) === "'")) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv();

const TARGET_STOCK = 10;

async function main() {
  const { PrismaClient } = require("../../../shared/db/generated/client");
  const prisma = new PrismaClient();

  try {
    const where = {
      published: true,
      product: {
        published: true,
        deletedAt: null,
      },
    };

    const before = await prisma.productVariant.groupBy({
      by: ["stock"],
      where,
      _count: true,
    });

    const result = await prisma.productVariant.updateMany({
      where: {
        ...where,
        stock: { not: TARGET_STOCK },
      },
      data: { stock: TARGET_STOCK },
    });

    const iphone = await prisma.productVariant.findFirst({
      where: { sku: "ym-apple-iphone-16e-0" },
      select: { id: true, sku: true, stock: true, priceOnRequest: true },
    });

    const after = await prisma.productVariant.groupBy({
      by: ["stock"],
      where,
      _count: true,
    });

    console.log(
      JSON.stringify(
        {
          targetStock: TARGET_STOCK,
          updatedVariants: result.count,
          iphone16e: iphone,
          stockBefore: before,
          stockAfter: after,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
