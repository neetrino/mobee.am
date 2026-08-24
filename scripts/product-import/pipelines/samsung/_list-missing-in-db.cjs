"use strict";

const path = require("path");
const fs = require("fs");
const { SAMSUNG_PHONE_WHITELIST } = require("./whitelist.constants.cjs");

const ROOT = path.join(__dirname, "../../../..");

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

async function main() {
  loadEnv();
  const { PrismaClient } = require("../../shared/db/generated/client");
  const prisma = new PrismaClient();

  try {
    const products = await prisma.product.findMany({
      where: { deletedAt: null, brand: { slug: "samsung" } },
      include: { translations: { where: { locale: "en" } } },
      orderBy: { createdAt: "asc" },
    });

    const inDb = new Set(products.map((p) => (p.translations[0]?.title || "").trim()));
    const missing = SAMSUNG_PHONE_WHITELIST.filter((m) => !inDb.has(m));

    console.log(JSON.stringify({ in_db_count: products.length, missing_count: missing.length, in_db: [...inDb].sort(), missing }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
