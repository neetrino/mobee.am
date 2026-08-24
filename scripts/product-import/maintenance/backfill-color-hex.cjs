#!/usr/bin/env node
/**
 * Backfill attribute_values.colors from PRODUCT_COLOR_HEX map.
 *
 * Usage:
 *   node scripts/backfill-color-hex.cjs --dry-run
 *   CONFIRM_BACKFILL_COLOR_HEX=YES node scripts/backfill-color-hex.cjs
 */

"use strict";

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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  });
}

loadEnv(path.join(__dirname, "../../../.env"));

const { PrismaClient } = require("../../../shared/db/generated/client");

const COLOR_HEX = {
  beige: "#F5F5DC",
  black: "#1D1D1F",
  blue: "#276787",
  brown: "#A52A2A",
  gray: "#808080",
  grey: "#808080",
  green: "#394C38",
  red: "#BF0013",
  white: "#FFFFFF",
  yellow: "#F9E479",
  orange: "#FF8A4C",
  pink: "#FADDD7",
  purple: "#594F63",
  navy: "#000080",
  maroon: "#800000",
  olive: "#808000",
  teal: "#4A9B8E",
  cyan: "#00FFFF",
  magenta: "#FF00FF",
  lime: "#00FF00",
  silver: "#E2E3E4",
  gold: "#F4E8CE",
  tan: "#D2B48C",
  indigo: "#3D3F84",
  lavender: "#E6E6FA",
  "space black": "#1D1D1F",
  "space gray": "#535150",
  "space grey": "#535150",
  starlight: "#F6F2EF",
  midnight: "#232A35",
  "deep purple": "#59456B",
  ultramarine: "#2E4A8A",
  "deep blue": "#1E2D49",
  "light blue": "#A8C8E8",
  "mist blue": "#A8B8C8",
  "light green": "#BDD5B0",
  "light yellow": "#F5F0A8",
  "light gold": "#F5E6C8",
  "soft pink": "#F5D0C8",
  blush: "#E8C4C4",
  sage: "#AFBFA5",
  citrus: "#E8EEA9",
  "cloud white": "#F5F5F7",
  "cosmic orange": "#FF8932",
  "dark cherry": "#5A1F23",
  "dark gray": "#545454",
  "desert black": "#2B2B2B",
  "desert titanium": "#C9B896",
  "natural titanium": "#837F7D",
  "sky blue": "#A7C7E7",
  "blue titanium": "#394E63",
  "black titanium": "#2B2B2C",
  "white titanium": "#F2F1ED",
  "silver titanium": "#C2C2C2",
  "gold titanium": "#C9A227",
  "orange titanium": "#C65A30",
  "midnight titanium": "#3C3C3D",
  "twill black": "#1A1A1A",
  "gray/green": "#78866B",
  clear: "#F0F0F0",
  transparent: "#FFFFFF",
  sky: "#A7C7E7",
  titanium: "#837F7D",
};

function normalizeColorKey(name) {
  return String(name).toLowerCase().trim().replace(/\s+/g, " ");
}

const DRY_RUN = process.argv.includes("--dry-run");
const CONFIRMED = process.env.CONFIRM_BACKFILL_COLOR_HEX === "YES";
const prisma = new PrismaClient();

async function main() {
  console.log("=== Backfill color hex ===");
  if (DRY_RUN) console.log("DRY RUN");

  const rows = await prisma.$queryRawUnsafe(`
    SELECT av.id, av.value, av.colors, t.label
    FROM attribute_values av
    JOIN attributes a ON a.id = av."attributeId"
    LEFT JOIN attribute_value_translations t ON t."attributeValueId" = av.id AND t.locale = 'en'
    WHERE a.key = 'color'
  `);

  let updated = 0;
  let unknown = [];

  for (const row of rows) {
    const key = normalizeColorKey(row.value);
    const labelKey = normalizeColorKey(row.label || "");
    const hex = COLOR_HEX[key] || COLOR_HEX[labelKey];
    if (!hex) {
      unknown.push(row.label || row.value);
      continue;
    }
    const current = Array.isArray(row.colors) ? row.colors : [];
    if (current[0] === hex) continue;
    updated++;
    if (DRY_RUN) {
      console.log(`  would set ${row.label || row.value} -> ${hex}`);
      continue;
    }
    if (!CONFIRMED) continue;
    await prisma.attributeValue.update({
      where: { id: row.id },
      data: { colors: [hex] },
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
