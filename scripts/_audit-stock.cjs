#!/usr/bin/env node
"use strict";
const path = require("path");
const fs = require("fs");
function loadEnv() {
  const envPath = path.join(__dirname, "../.env");
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
loadEnv();
const { PrismaClient } = require("../shared/db/generated/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    const iphone = await prisma.product.findFirst({
      where: { translations: { some: { slug: "iphone-16e" } } },
      include: {
        translations: { where: { locale: "en" }, select: { title: true } },
        variants: { select: { id: true, sku: true, stock: true, price: true, priceOnRequest: true, published: true } },
      },
    });
    const appleLowStock = await prisma.productVariant.findMany({
      where: {
        source: { in: ["yerevanmobile", "ispace", "mobilecentre"] },
        stock: { lt: 10 },
      },
      select: { id: true, sku: true, stock: true, source: true, productId: true },
      take: 30,
    });
    const counts = await prisma.productVariant.groupBy({
      by: ["stock"],
      _count: true,
      orderBy: { stock: "asc" },
      take: 15,
    });
    console.log(JSON.stringify({ iphone16e: iphone, appleLowStockCount: appleLowStock.length, appleLowStockSample: appleLowStock.slice(0, 10), stockDistribution: counts }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}
main();
