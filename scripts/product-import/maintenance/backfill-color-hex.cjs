#!/usr/bin/env node
/**
 * Backfill attribute_values.colors from catalog color names.
 * Dyson CMF aliases use dyson-color-registry HEX (never generic pink/blue).
 * Covers all products: Titanium Black, Phantom Violet, basic hues, etc.
 *
 * Usage:
 *   node scripts/product-import/maintenance/backfill-color-hex.cjs --dry-run
 *   CONFIRM_BACKFILL_COLOR_HEX=YES node scripts/product-import/maintenance/backfill-color-hex.cjs
 */

"use strict";

const path = require("path");
const fs = require("fs");
const { hexesForColorName } = require("../shared/catalog-color-hex.cjs");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  fs.readFileSync(filePath, "utf8").split("\n").forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return;
    const eq = t.indexOf("=");
    if (eq < 1) return;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  });
}

loadEnv(path.join(__dirname, "../../../.env"));

const { PrismaClient } = require("../../../shared/db/generated/client");

const PLACEHOLDER_HEX = new Set(["#cccccc", "#ccc"]);

function storedHexes(colors) {
  const list = Array.isArray(colors) ? colors : [];
  return list
    .map((value) => String(value || "").trim())
    .filter((value) => value && !PLACEHOLDER_HEX.has(value.toLowerCase()));
}

function sameHexes(left, right) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value.toLowerCase() === right[index].toLowerCase());
}

function resolveHexes(row) {
  const fromValue = hexesForColorName(row.value);
  if (fromValue.length > 0) return fromValue;
  return hexesForColorName(row.label || "");
}

const DRY_RUN = process.argv.includes("--dry-run");
const CONFIRMED = process.env.CONFIRM_BACKFILL_COLOR_HEX === "YES";
const prisma = new PrismaClient();

async function main() {
  console.log("=== Backfill color hex (all catalog colors) ===");
  if (DRY_RUN) console.log("DRY RUN");

  const rows = await prisma.$queryRawUnsafe(`
    SELECT av.id, av.value, av.colors, t.label
    FROM attribute_values av
    JOIN attributes a ON a.id = av."attributeId"
    LEFT JOIN attribute_value_translations t
      ON t."attributeValueId" = av.id AND t.locale = 'en'
    WHERE a.key = 'color'
  `);

  let updated = 0;
  const unknown = [];

  for (const row of rows) {
    const hexes = resolveHexes(row);
    if (hexes.length === 0) {
      unknown.push(row.label || row.value);
      continue;
    }
    if (sameHexes(storedHexes(row.colors), hexes)) continue;
    updated += 1;
    if (DRY_RUN) {
      console.log(`  would set ${row.label || row.value} -> ${hexes.join(", ")}`);
      continue;
    }
    if (!CONFIRMED) continue;
    await prisma.attributeValue.update({
      where: { id: row.id },
      data: { colors: hexes },
    });
  }

  console.log(`  updated: ${updated}, unknown: ${unknown.length}`);
  if (unknown.length) {
    console.log("  still need manual hex:");
    for (const name of unknown) console.log(`  - ${name}`);
  }
  if (!DRY_RUN && !CONFIRMED && updated > 0) {
    console.log("  Set CONFIRM_BACKFILL_COLOR_HEX=YES to apply.");
  }
  console.log("=== Done ===");
}

main()
  .catch((err) => {
    console.error("\n❌", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
