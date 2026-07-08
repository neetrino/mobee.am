"use strict";

const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");
const { writeTargetsTsv } = require("../targets.cjs");

const ROOT = path.join(__dirname, "../../../../../");
const PY_SCRIPT = path.join(__dirname, "../../../sources/mobilecentre/1.py");

function resolvePythonCommand() {
  for (const cmd of ["python", "py", "python3"]) {
    const r = spawnSync(cmd, ["--version"], { encoding: "utf8" });
    if (r.status === 0) return cmd;
  }
  return null;
}

function runMobileCentreScrape(targets, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const tsvPath = path.join(outDir, "mobilecentre-targets.tsv");
  writeTargetsTsv(tsvPath, fs);

  const pyCmd = resolvePythonCommand();
  if (!pyCmd) throw new Error("Python not found (tried python, py, python3)");

  console.log(`[mobilecentre] Running 1.py with targets via ${pyCmd}...`);
  const result = spawnSync(pyCmd, [PY_SCRIPT, "--targets", tsvPath, "--fast"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 20 * 60 * 1000,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`MobileCentre scraper failed with code ${result.status}`);
  }

  const flatPath = path.join(ROOT, "data/product-import/apple/mobilecentre_apple_flat_variants.json");
  const variablePath = path.join(ROOT, "data/product-import/apple/mobilecentre_apple_variable_products.json");
  const missingPath = path.join(ROOT, "data/product-import/apple/mobilecentre_missing_targets.json");

  const flat = fs.existsSync(flatPath) ? JSON.parse(fs.readFileSync(flatPath, "utf8")) : [];
  const variable = fs.existsSync(variablePath) ? JSON.parse(fs.readFileSync(variablePath, "utf8")) : [];
  const missing = fs.existsSync(missingPath) ? JSON.parse(fs.readFileSync(missingPath, "utf8")) : [];

  fs.copyFileSync(flatPath, path.join(outDir, "mobilecentre_flat.json"));
  if (fs.existsSync(variablePath)) fs.copyFileSync(variablePath, path.join(outDir, "mobilecentre_variable.json"));
  if (fs.existsSync(missingPath)) fs.copyFileSync(missingPath, path.join(outDir, "mobilecentre_missing.json"));

  return { flat, variable, missing, stdout: result.stdout };
}

function mapMobileCentreVariant(v) {
  return {
    source: "mobilecentre",
    source_name: "MobileCentre",
    source_url: v.product_url,
    source_pid: v.source_pid ? String(v.source_pid) : null,
    sku: v.source_pid ? `mc-${v.source_pid}` : null,
    name: v.name,
    model: v.model,
    normalized_model: v.model,
    category: v.category,
    price: typeof v.price === "number" ? v.price : null,
    currency: v.currency || "AMD",
    stock_status: v.price ? "in_stock" : "unknown",
    description: v.description || v.descriptionRaw || "",
    descriptionHtml: v.descriptionHtml || null,
    specifications: v.description || v.descriptionRaw || "",
    options: v.options || {},
    image_url: v.image_url || null,
    gallery: Array.isArray(v.gallery) ? v.gallery : [],
    gallery_by_color: v.options?.color ? { [v.options.color]: v.gallery || [] } : {},
    variant_source_type: "separate_url",
    is_accessory: Boolean(v.is_accessory),
    visible_id: v.visible_id || null,
  };
}

async function searchMobileCentre(targets) {
  const outDir = path.join(ROOT, "audit/product-import/apple/scrape-cache/mobilecentre");
  const { flat } = runMobileCentreScrape(targets, outDir);
  const mapped = flat.map(mapMobileCentreVariant);
  console.log(`[mobilecentre] ${mapped.length} flat variants scraped`);
  return mapped;
}

module.exports = { searchMobileCentre, mapMobileCentreVariant, runMobileCentreScrape };
