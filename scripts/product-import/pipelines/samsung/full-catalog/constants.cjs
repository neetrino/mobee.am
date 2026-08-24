"use strict";

const path = require("path");

const ROOT = path.join(__dirname, "../../../../../");
const OUT_DIR = path.join(ROOT, "audit/product-import/samsung/full-catalog");
const DRY_RUN_JSON = path.join(OUT_DIR, "samsung-full-catalog.dry-run.json");
const APPLY_RESULT_JSON = path.join(OUT_DIR, "samsung-full-catalog-apply-result.json");
const REPORT_MD = path.join(OUT_DIR, "samsung-full-catalog-report.md");
const VERIFICATION_MD = path.join(OUT_DIR, "samsung-full-catalog-verification-report.md");

const VARIABLE_FILE = path.join(ROOT, "data/product-import/samsung/mobilecentre_samsung_variable_products.json");
const FLAT_FILE = path.join(ROOT, "data/product-import/samsung/mobilecentre_samsung_flat_variants.json");

const AMD_RATE = 400;
const DEFAULT_STOCK = 10;
const LOCALES = ["en", "hy", "ru"];
const CATEGORY_SLUG = "phones";
const APPROVED_SOURCES = new Set(["mobilecentre", "yerevanmobile"]);

const KEY_SLUGS = [
  "samsung-galaxy-s25-edge",
  "samsung-galaxy-a26",
  "samsung-galaxy-a56",
  "samsung-galaxy-a06",
  "samsung-galaxy-s25-ultra",
];

module.exports = {
  ROOT,
  OUT_DIR,
  DRY_RUN_JSON,
  APPLY_RESULT_JSON,
  REPORT_MD,
  VERIFICATION_MD,
  VARIABLE_FILE,
  FLAT_FILE,
  AMD_RATE,
  DEFAULT_STOCK,
  LOCALES,
  CATEGORY_SLUG,
  APPROVED_SOURCES,
  KEY_SLUGS,
};
