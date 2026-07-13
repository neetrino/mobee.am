"use strict";

const path = require("path");
const fs = require("fs");
const { IMPORT_TARGETS } = require("./targets.cjs");
const { matchesTarget, parentModelKey } = require("./normalize.cjs");
const { searchMobileCentre } = require("./providers/mobilecentre.cjs");
const { searchISpace } = require("./providers/ispace.cjs");
const { searchYerevanMobile } = require("./providers/yerevanmobile.cjs");
const { buildVariableProducts } = require("./build-variable-products.cjs");
const { loadExistingCatalog, annotateWithDbStatus } = require("./check-existing-db.cjs");

const OUT_DIR = path.join(__dirname, "../../../../audit/product-import/apple");

const { NO_PRICE_IMPORT_ALLOWLIST } = require("./no-price-allowlist.cjs");

function filterVariantsForTargets(variants, targets, { allowNoPrice = false } = {}) {
  const matched = [];
  const rejected = [];
  for (const v of variants) {
    let okTarget = null;
    for (const t of targets) {
      const m = matchesTarget(t.model, v.name || v.model || "", v.source_url || "");
      if (m.ok) {
        okTarget = t.model;
        v.target_model = t.model;
        v.normalized_model = parentModelKey(v.name || v.model || "");
        break;
      }
    }
    if (!okTarget) continue;
    if (!v.image_url && !(v.gallery && v.gallery.length)) {
      rejected.push({ target: okTarget, source: v.source, url: v.source_url, reason: "missing_images" });
      continue;
    }
    const noPriceAllowed =
      allowNoPrice && NO_PRICE_IMPORT_ALLOWLIST.has(okTarget) && (v.price_on_request || !v.price);
    if (!v.price && !noPriceAllowed) {
      rejected.push({ target: okTarget, source: v.source, url: v.source_url, reason: "missing_price" });
      continue;
    }
    if (noPriceAllowed) {
      v.price_on_request = true;
      v.price = 0;
    }
    matched.push(v);
  }
  return { matched, rejected };
}

async function runDryRun({ skipMobileCentre = false, allowNoPrice = false } = {}) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const targets = IMPORT_TARGETS;
  const allRejected = [];
  const flat = [];

  if (!skipMobileCentre) {
    try {
      const mc = await searchMobileCentre(targets);
      const { matched, rejected } = filterVariantsForTargets(mc, targets, { allowNoPrice });
      flat.push(...matched);
      allRejected.push(...rejected);
    } catch (e) {
      allRejected.push({ source: "mobilecentre", reason: "blocked_or_failed", error: e.message });
      console.error("[mobilecentre] FAILED:", e.message);
    }
  }

  try {
    const { variants, rejected } = await searchISpace(targets, { allowNoPrice });
    flat.push(...variants);
    allRejected.push(...rejected);
  } catch (e) {
    allRejected.push({ source: "ispace", reason: "blocked_or_failed", error: e.message });
    console.error("[ispace] FAILED:", e.message);
  }

  try {
    const { variants, rejected } = await searchYerevanMobile(targets);
    flat.push(...variants);
    allRejected.push(...rejected);
  } catch (e) {
    allRejected.push({ source: "yerevanmobile", reason: "blocked_or_failed", error: e.message });
    console.error("[yerevanmobile] FAILED:", e.message);
  }

  const products = buildVariableProducts(flat);
  const catalog = await loadExistingCatalog();
  const annotated = annotateWithDbStatus(products, catalog, { allowNoPrice });

  const foundTargets = new Set(flat.map((v) => v.target_model).filter(Boolean));
  const readyProducts = annotated.filter((p) => p.ready_to_import);
  const existingProducts = annotated.filter((p) => p.db_status === "exists");

  const notFound = targets
    .filter((t) => !foundTargets.has(t.model))
    .map((t) => ({ target: t.model, category: t.category, year: t.year, reason: "not_found_on_allowed_sources" }));

  const payload = {
    generated_at: new Date().toISOString(),
    summary: {
      target_count: targets.length,
      found_on_sources: foundTargets.size,
      flat_variants_found: flat.length,
      ready_to_import_parent_products: readyProducts.length,
      ready_to_import_variants: readyProducts.reduce((s, p) => s + p.variants.filter((v) => v.db_status === "new").length, 0),
      already_exists_in_db: existingProducts.length,
      not_found_on_allowed_sources: notFound.length,
      rejected: allRejected.length,
    },
    products: readyProducts,
    all_discovered_products: annotated,
    not_added: [
      ...notFound,
      ...allRejected.map((r) => ({ ...r, status: "rejected_or_skipped" })),
      ...annotated
        .filter((p) => !p.ready_to_import && p.db_status !== "exists")
        .map((p) => ({ target: p.target_model, reason: "found_but_not_ready", sources: p.source_urls })),
      ...annotated
        .filter((p) => p.db_status === "exists")
        .map((p) => ({ target: p.target_model, reason: "already_exists_in_db", db_product_id: p.db_match?.product?.id })),
    ],
  };

  fs.writeFileSync(path.join(OUT_DIR, "new-apple-products.dry-run.json"), JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "new-apple-products.json"), JSON.stringify({ ...payload, products: readyProducts }, null, 2), "utf8");

  return payload;
}

module.exports = { runDryRun, OUT_DIR };
