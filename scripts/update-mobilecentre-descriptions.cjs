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
loadEnv(path.join(__dirname, "../.env"));

const { PrismaClient } = require("../shared/db/generated/client");
const prisma = new PrismaClient();

const PRODUCTS_JSON = path.join(__dirname, "../mobilecentre_all_apple_products.json");

const NOISE_PATTERNS = [
  /Նշված արժեքը/, /Ապառիկը ձևակերպելիս/, /Յունիբանկ/, /ԱԿԲԱ Բանկ/,
  /Ինեկոբանկ/, /ՎՏԲ/, /unibank\.am/, /acba\.am/, /inecobank\.am/, /vtb\.am/,
  /Tweet/, /Share/, /Դուք հաջողությամբ/, /Ապրանքը պահպանված/,
  /Բոնուսային միավոր/, /Մեր մասին/, /© 20/, /MobileCentre/, /\+374/,
];

const SECTION_HEADERS = new Set([
  "Հիշողություն և Պրոցեսոր", "Ցանց", "Սնուցում", "Այլ", "Տեսախցիկներ", "Էկրան",
]);

function buildDescriptionHtml(raw) {
  if (!raw) return null;

  const parts = raw.split("|").map((s) => s.trim()).filter(Boolean);
  const rows = [];
  let i = 0;

  while (i < parts.length) {
    const token = parts[i];
    if (NOISE_PATTERNS.some((p) => p.test(token))) break;
    if (token.startsWith("http")) { i++; continue; }
    if (SECTION_HEADERS.has(token)) { rows.push({ type: "section", label: token }); i++; continue; }

    const next = parts[i + 1];
    if (next && !NOISE_PATTERNS.some((p) => p.test(next)) && !next.startsWith("http")) {
      rows.push({ type: "row", label: token, value: next });
      i += 2;
    } else {
      if (token.length < 80) rows.push({ type: "status", label: token });
      i++;
    }
  }

  if (rows.length === 0) return null;

  const statusRows = rows.filter((r) => r.type === "status");
  const specRows = rows.filter((r) => r.type === "row" || r.type === "section");

  let html = "";
  if (statusRows.length > 0)
    html += `<p class="product-status">${statusRows.map((r) => r.label).join(" · ")}</p>`;

  if (specRows.length > 0) {
    html += `<table class="product-specs"><tbody>`;
    for (const row of specRows) {
      if (row.type === "section")
        html += `<tr class="specs-section"><td colspan="2">${row.label}</td></tr>`;
      else
        html += `<tr><td class="spec-label">${row.label}</td><td class="spec-value">${row.value}</td></tr>`;
    }
    html += `</tbody></table>`;
  }

  return html || null;
}

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
