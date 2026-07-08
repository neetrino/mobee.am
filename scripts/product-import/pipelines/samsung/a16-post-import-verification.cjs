#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { fetchHtml } = require("../apple/http.cjs");
const { OUT_DIR, RESULT_PATH, DRY_RUN_JSON, TARGET_MODEL } = require("./import-a16.cjs");

const REPORT_PATH = path.join(OUT_DIR, "samsung-a16-post-import-verification-report.md");

async function main() {
  const payload = fs.existsSync(DRY_RUN_JSON) ? JSON.parse(fs.readFileSync(DRY_RUN_JSON, "utf8")) : null;
  const importResult = fs.existsSync(RESULT_PATH) ? JSON.parse(fs.readFileSync(RESULT_PATH, "utf8")) : null;

  if (!importResult?.summary?.parent_products_created) {
    const lines = [
      "# Samsung Galaxy A16 Import Result",
      "",
      `> Generated: ${new Date().toISOString()}`,
      "",
      "## Summary",
      "",
      "| Metric | Count |",
      "| --- | ---: |",
      "| Parent products created | 0 |",
      "| Variants created | 0 |",
      "| Import executed | No |",
      "",
      "## Final Status",
      "",
      "**blocked / not_found** — import was not executed because no valid source listing was found.",
      "",
      payload?.recommendation || "Run a16-source-audit.cjs first.",
      "",
      "## Source Audit",
      "",
      `- YerevanMobile: ${payload?.source_audit?.yerevanmobile?.status || "unknown"}`,
      `- MobileCentre: ${payload?.source_audit?.mobilecentre?.status || "unknown"}`,
      "",
    ];
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(REPORT_PATH, lines.join("\n"), "utf8");
    console.log(JSON.stringify({ status: "not_imported", report: REPORT_PATH }, null, 2));
    return;
  }

  const root = path.join(__dirname, "../../../..");
  for (const line of fs.readFileSync(path.join(root, ".env"), "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }

  const { PrismaClient } = require("../../shared/db/generated/client");
  const prisma = new PrismaClient();
  try {
    const product = await prisma.product.findFirst({
      where: {
        deletedAt: null,
        translations: { some: { locale: "en", title: TARGET_MODEL } },
      },
      include: {
        translations: { where: { locale: "en" } },
        variants: true,
        brand: true,
        categories: { include: { translations: { where: { locale: "en" } } } },
      },
    });

    const slug = product?.translations[0]?.slug;
    let frontend = "SKIPPED";
    if (slug) {
      const { status } = await fetchHtml(`http://localhost:3000/api/v1/products/${slug}?lang=en`, { sleepMs: 50 });
      frontend = status === 200 ? "PASS" : "FAIL";
    }

    fs.writeFileSync(
      REPORT_PATH,
      [
        "# Samsung Galaxy A16 Import Result",
        "",
        "## Summary",
        "",
        `| Parent products created | ${importResult.summary.parent_products_created} |`,
        `| Variants created | ${importResult.summary.variants_created} |`,
        "",
        "## Verification",
        "",
        `| Product in DB | ${product ? "PASS" : "FAIL"} |`,
        `| Frontend API | ${frontend} |`,
        "",
      ].join("\n"),
      "utf8",
    );
    console.log(JSON.stringify({ status: "verified", report: REPORT_PATH }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
