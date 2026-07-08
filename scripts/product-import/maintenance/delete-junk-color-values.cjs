"use strict";
const path = require("path");
const fs = require("fs");

const JUNK_COLOR_VALUES = [
  "MUFG2",
  "MX532",
  "MXP63",
  "MXP93",
  "MKUF3ZM/A",
  "MKUY3ZM/A",
  "Privacy",
  "without box",
];

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
const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const confirmed = process.env.CONFIRM_DELETE_JUNK_COLORS === "YES";

  console.log("=== Delete junk color attribute values ===");
  if (dryRun) console.log("DRY RUN");

  const colorAttr = await prisma.attribute.findUnique({ where: { key: "color" } });
  if (!colorAttr) throw new Error("color attribute not found");

  const junkValues = await prisma.attributeValue.findMany({
    where: {
      attributeId: colorAttr.id,
      value: { in: JUNK_COLOR_VALUES },
    },
    include: { translations: true },
  });

  console.log(`Found junk color values: ${junkValues.length}`);
  for (const av of junkValues) {
    const optionCount = await prisma.productVariantOption.count({ where: { valueId: av.id } });
    console.log(`- ${av.value} (options linked: ${optionCount})`);
  }

  if (dryRun || !confirmed) {
    if (!dryRun && !confirmed) {
      console.log("Set CONFIRM_DELETE_JUNK_COLORS=YES to apply.");
    }
    return;
  }

  let deletedOptions = 0;
  let deletedValues = 0;

  for (const av of junkValues) {
    const removedOptions = await prisma.productVariantOption.deleteMany({
      where: {
        OR: [
          { valueId: av.id },
          {
            attributeKey: "color",
            value: av.value,
          },
        ],
      },
    });
    deletedOptions += removedOptions.count;

    await prisma.attributeValue.delete({ where: { id: av.id } });
    deletedValues++;
  }

  console.log(`Deleted variant options: ${deletedOptions}`);
  console.log(`Deleted attribute values: ${deletedValues}`);
  console.log("=== Done ===");
}

main()
  .catch((err) => {
    console.error("\n❌", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
