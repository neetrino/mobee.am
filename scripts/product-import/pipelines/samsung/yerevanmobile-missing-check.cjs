#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { fetchHtml, stripTags } = require("../apple/http.cjs");
const {
  matchWhitelistModel,
  isHardRejected,
  isAccessory,
} = require("./whitelist.cjs");
const {
  loadExistingCatalog,
  checkProductExists,
  checkVariantExists,
} = require("./check-existing-db.cjs");
const { slugify, normalize, variantDedupeKey } = require("./normalize.cjs");
const { YEREVANMOBILE_IMPORT_SCOPE } = require("./whitelist.constants.cjs");
const { parseJsonConfigVariants } = require("../../shared/yerevanmobile-json-config.cjs");

const BASE = "https://www.yerevanmobile.am";
const ROOT = path.join(__dirname, "../../../..");
const OUT_DIR = path.join(ROOT, "audit/product-import/samsung/yerevanmobile-missing-check");

const TARGET_MODELS = [...YEREVANMOBILE_IMPORT_SCOPE];

const SLUG_ALIASES = {
  "Samsung Galaxy A06": ["samsung-galaxy-a06"],
  "Samsung Galaxy A07": ["samsung-galaxy-a07-4g", "samsung-galaxy-a07"],
  "Samsung Galaxy A17": ["samsung-galaxy-a17"],
  "Samsung Galaxy A26": ["samsung-galaxy-a26"],
  "Samsung Galaxy A27": ["samsung-galaxy-a27"],
  "Samsung Galaxy A36": ["samsung-galaxy-a36"],
  "Samsung Galaxy A37": ["samsung-galaxy-a37"],
  "Samsung Galaxy A56": ["samsung-galaxy-a56"],
  "Samsung Galaxy A57": ["samsung-galaxy-a57"],
  "Samsung Galaxy S25 Edge": ["samsung-galaxy-s25-edge"],
  "Samsung Galaxy Z TriFold": ["samsung-galaxy-z-trifold"],
};

const SAMSUNG_CATEGORY_URLS = [
  `${BASE}/en/electronics/phones/samsung.html`,
  `${BASE}/am/heraxosner/samsung.html`,
  `${BASE}/ru/electronics/phones/samsung.html`,
  `${BASE}/en/phones/samsung.html`,
  `${BASE}/am/phones/samsung.html`,
  `${BASE}/ru/phones/samsung.html`,
];

const LANGS = ["en", "am", "ru"];
const MIN_PHONE_PRICE_AMD = 50000;

function isProductPageUrl(url) {
  if (!url || !/yerevanmobile\.am/.test(url)) return false;
  if (/catalogsearch\/result/i.test(url)) return false;
  return /\.html$/i.test(url.split("?")[0]);
}

function isListingPage(title, url) {
  if (/catalogsearch\/result/i.test(url || "")) return true;
  if (/search results for/i.test(title || "")) return true;
  if (/^samsung$/i.test(String(title || "").trim())) return true;
  return false;
}

function parsePrimaryProductPrice(html) {
  const scoped = html.match(/product-info-price[\s\S]{0,6000}/i)?.[0] || html;
  const byId = scoped.match(/id="product-price-\d+"[^>]*data-price-amount="(\d+)"/i);
  if (byId) return parseInt(byId[1], 10);
  const finalPrice = scoped.match(/data-price-type="finalPrice"[^>]*data-price-amount="(\d+)"/i);
  if (finalPrice) return parseInt(finalPrice[1], 10);
  const metaPrice = html.match(/itemprop="price"[^>]*content="(\d+)"/i);
  if (metaPrice) return parseInt(metaPrice[1], 10);
  return null;
}

function filterPhonePrices(prices) {
  return prices.filter((price) => Number.isFinite(price) && price >= MIN_PHONE_PRICE_AMD);
}

function absUrl(href) {
  if (!href) return null;
  if (href.startsWith("http")) return href.split("#")[0];
  return `${BASE}${href.startsWith("/") ? "" : "/"}${href}`.split("#")[0];
}

function slugCandidatesForModel(model) {
  const slugBase = slugify(model.replace(/^Samsung\s+/i, "samsung-"));
  const slugBases = new Set([slugBase, slugBase.replace(/-/g, ""), ...(SLUG_ALIASES[model] || [])]);
  const urls = new Set();
  for (const lang of LANGS) {
    for (const slugPart of slugBases) {
      urls.add(`${BASE}/${lang}/${slugPart}.html`);
    }
    urls.add(`${BASE}/${lang}/samsung-${slugify(model.replace(/^Samsung Galaxy\s+/i, ""))}.html`);
  }
  return [...urls];
}

function searchUrlsForModel(model) {
  const q = encodeURIComponent(model);
  return LANGS.map((lang) => `${BASE}/${lang}/catalogsearch/result/?q=${q}`);
}

function extractSamsungProductLinks(html) {
  const links = new Set();
  const re = /href=["']([^"']*(?:samsung|galaxy)[^"']*\.html)["']/gi;
  let match;
  while ((match = re.exec(html))) {
    const url = absUrl(match[1]);
    if (!url || !/yerevanmobile\.am/.test(url)) continue;
    if (/tablet|watch|tab-|buds|case|cover|charger|cable|protector|accessory|screen-protector/i.test(url)) {
      continue;
    }
    if (isProductPageUrl(url)) links.add(url);
  }
  return [...links];
}

function parseTitle(html) {
  const h1 = html.match(/<h1[^>]*class="[^"]*page-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return stripTags(h1[1]);
  const h1b = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return h1b ? stripTags(h1b[1]) : null;
}

function parseYmGalleryFromHtml(html) {
  const marker = '"[data-gallery-role=gallery-placeholder]"';
  const idx = html.indexOf(marker);
  if (idx < 0) return [];
  const dataMatch = html.slice(idx, idx + 120000).match(/"data"\s*:\s*(\[[\s\S]*?\])\s*,\s*"options"/);
  if (!dataMatch) return [];
  try {
    const items = JSON.parse(dataMatch[1]);
    const sorted = [...items].sort((a, b) => {
      if (a.isMain && !b.isMain) return -1;
      if (!a.isMain && b.isMain) return 1;
      return Number(a.position || 0) - Number(b.position || 0);
    });
    const seen = new Set();
    const urls = [];
    for (const item of sorted) {
      const url = item.full || item.img || item.thumb;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      urls.push(url);
    }
    return urls;
  } catch {
    return [];
  }
}

function parseImages(html) {
  const fromGalleryJson = parseYmGalleryFromHtml(html);
  if (fromGalleryJson.length) return fromGalleryJson.slice(0, 12);

  const imgs = new Set();
  const re = /https:\/\/www\.yerevanmobile\.am\/media\/catalog\/product\/[^"'\s)]+\.(?:jpg|jpeg|png|webp)/gi;
  let match;
  while ((match = re.exec(html))) {
    const url = match[0];
    if (/logo|brand|placeholder|case|cover|charger|cable|protector|glass|wallet|strap|band/i.test(url)) {
      continue;
    }
    imgs.add(url);
  }
  return [...imgs].slice(0, 12);
}

function parseSku(html) {
  const skuMatch = html.match(/itemprop="sku"[^>]*content="([^"]+)"/i);
  return skuMatch ? skuMatch[1] : null;
}

function extractRamStorage(name) {
  const slash = name.match(/\b(4|6|8|12|16)\s*GB\s*\/\s*(64|128|256|512)\s*GB\b/i);
  if (slash) return { ram: `${slash[1]}GB`, storage: `${slash[2]}GB` };
  const tb = name.match(/\b(16)\s*GB\s*\/\s*1\s*TB\b/i);
  if (tb) return { ram: "16GB", storage: "1TB" };
  const storage = name.match(/\b(64|128|256|512)\s*GB\b|\b1\s*TB\b/i);
  return { ram: null, storage: storage ? storage[0].replace(/\s+/g, "").toUpperCase() : null };
}

function parseVariantOptions(label, title, html) {
  const options = {};
  const hay = `${title} ${label} ${stripTags(html.slice(0, 8000))}`;
  const { ram, storage } = extractRamStorage(`${title} ${label}`);
  if (ram) options.ram = ram;
  if (storage) options.storage = storage;
  if (/\b5g\b/i.test(hay)) options.connectivity = "5G";
  else if (/\b4g\b|\blte\b/i.test(hay)) options.connectivity = "4G";

  if (/gb|tb/i.test(label) && !options.storage) options.storage = label.toUpperCase().replace(/\s+/g, "");
  else if (!/gb|tb/i.test(label) && label.trim()) options.color = label.trim();

  return options;
}

function parseConfigurableVariants(html, baseTitle, url, pageSku) {
  const swatches = [...html.matchAll(/data-option-label="([^"]+)"[^>]*data-price-amount="(\d+)"/g)];
  const gallery = parseImages(html);
  const imageUrl = gallery[0] || null;
  const slug = url.split("/").pop()?.replace(".html", "") || "product";
  const variants = [];

  if (swatches.length) {
    for (const [, label, priceStr] of swatches) {
      const price = parseInt(priceStr, 10);
      if (!Number.isFinite(price) || price < MIN_PHONE_PRICE_AMD) continue;
      const options = parseVariantOptions(label, baseTitle, html);
      variants.push({
        name: `${baseTitle} (${label})`,
        options,
        price,
        source_pid: `${slug}-${normalize(label).replace(/\s+/g, "-")}`,
      });
    }
  }

  if (!variants.length) {
    const jsonConfigVariants = parseJsonConfigVariants(html, baseTitle, url, pageSku);
    variants.push(...jsonConfigVariants);
  }

  if (!variants.length) {
    const primaryPrice = parsePrimaryProductPrice(html);
    const fallbackPrices = filterPhonePrices(
      [...html.matchAll(/data-price-amount="(\d+)"/g)].map((m) => parseInt(m[1], 10)),
    );
    const price = primaryPrice && primaryPrice >= MIN_PHONE_PRICE_AMD
      ? primaryPrice
      : fallbackPrices.length
        ? Math.min(...fallbackPrices)
        : null;
    if (price) {
      variants.push({
        name: baseTitle,
        options: parseVariantOptions("", baseTitle, html),
        price,
        source_pid: slug,
      });
    }
  }

  const isConfigurable = swatches.length > 0 || variants.length > 1;

  return variants.map((variant) => ({
    source: "yerevanmobile",
    source_url: url,
    source_pid: variant.source_pid,
    sku: variant.sku || (pageSku ? `ym-${pageSku}-${variant.source_pid}` : `ym-${variant.source_pid}`),
    name: variant.name,
    model: null,
    price: variant.price,
    currency: "AMD",
    stock_status: /out of stock|չկա|unavailable/i.test(html) ? "out_of_stock" : "in_stock",
    options: Object.fromEntries(Object.entries(variant.options || {}).filter(([, v]) => v)),
    image_url: imageUrl,
    gallery,
    configurable: isConfigurable,
  }));
}

function matchesExactTarget(title, url, html, targetModel) {
  const text = `${title} ${url} ${stripTags(html.slice(0, 6000))}`;
  if (isHardRejected(text) || isAccessory(text)) {
    return { ok: false, reason: isAccessory(text) ? "accessory" : "hard_reject" };
  }

  const match = matchWhitelistModel(title);
  if (!match.model) return { ok: false, reason: match.reason || "not_in_whitelist" };
  if (match.model !== targetModel) {
    return { ok: false, reason: `matched_other_model:${match.model}` };
  }
  if (/\b5g\b/i.test(targetModel) && !/\b5g\b/i.test(text)) {
    return { ok: false, reason: "missing_explicit_5g" };
  }
  return { ok: true, model: match.model };
}

async function fetchPage(url) {
  try {
    const { text, status } = await fetchHtml(url, { sleepMs: 120 });
    if (status >= 400 || text.length < 800) return null;
    return text;
  } catch {
    return null;
  }
}

async function probeUrl(url, targetModel, triedNotes) {
  if (!isProductPageUrl(url)) return null;
  triedNotes.push(url);
  const html = await fetchPage(url);
  if (!html) return null;

  const title = parseTitle(html);
  if (!title || !/samsung|galaxy/i.test(title) || isListingPage(title, url)) return null;

  const gate = matchesExactTarget(title, url, html, targetModel);
  if (!gate.ok) {
    return { rejected: { product_title: title, source_url: url, reason: gate.reason, target_model: targetModel } };
  }

  const pageSku = parseSku(html);
  const parsed = parseConfigurableVariants(html, title, url, pageSku);
  if (!parsed.length) {
    return {
      found_but_not_imported: {
        target_model: targetModel,
        product_title: title,
        source_url: url,
        reason: "missing_or_invalid_price",
      },
    };
  }

  for (const variant of parsed) {
    variant.model = targetModel;
    variant.product_url = url;
  }

  const hasImage = parsed.every((v) => v.image_url || (v.gallery && v.gallery.length));
  if (!hasImage) {
    return {
      found_but_not_imported: {
        target_model: targetModel,
        product_title: title,
        source_url: url,
        reason: "missing_image",
      },
    };
  }

  const imprecise = parsed.some((v) => v.configurable && Object.keys(v.options).length <= 1);
  if (imprecise && parsed.length > 1) {
    return {
      found_but_not_imported: {
        target_model: targetModel,
        product_title: title,
        source_url: url,
        reason: "configurable_options_not_precise",
        variant_count: parsed.length,
      },
      variants_preview: parsed,
    };
  }

  return {
    hit: {
      target_model: targetModel,
      product_title: title,
      source_url: url,
      source_language: url.match(/\/(en|am|ru)\//)?.[1] || "unknown",
      source_sku: pageSku,
      variants: parsed,
    },
  };
}

async function gatherCandidateUrls(targetModel) {
  const candidates = new Set();
  for (const url of slugCandidatesForModel(targetModel)) {
    if (isProductPageUrl(url)) candidates.add(url);
  }
  for (const catUrl of SAMSUNG_CATEGORY_URLS) {
    const html = await fetchPage(catUrl);
    if (!html) continue;
    for (const link of extractSamsungProductLinks(html)) candidates.add(link);
  }
  for (const searchUrl of searchUrlsForModel(targetModel)) {
    const html = await fetchPage(searchUrl);
    if (!html) continue;
    for (const link of extractSamsungProductLinks(html)) candidates.add(link);
  }
  return [...candidates];
}

function pickBestHit(hits) {
  if (!hits.length) return null;
  return hits.sort((a, b) => b.variants.length - a.variants.length || b.product_title.length - a.product_title.length)[0];
}

async function searchTargetModel(targetModel) {
  const triedNotes = [];
  const rejected = [];
  const hits = [];
  const blocked = [];

  const candidates = await gatherCandidateUrls(targetModel);
  for (const url of candidates) {
    const result = await probeUrl(url, targetModel, triedNotes);
    if (result?.hit) hits.push(result.hit);
    if (result?.rejected) rejected.push(result.rejected);
    if (result?.found_but_not_imported) blocked.push(result.found_but_not_imported);
  }

  const bestHit = pickBestHit(hits);
  if (bestHit) return { ...bestHit, checked_paths: triedNotes, rejected };

  if (blocked.length) {
    return { found_but_not_imported: blocked[0], checked_paths: triedNotes, rejected };
  }

  return { not_found: true, checked_paths: triedNotes, rejected };
}

function summarizeOptions(variants) {
  const buckets = {};
  for (const variant of variants) {
    for (const [key, value] of Object.entries(variant.options || {})) {
      if (!value) continue;
      if (!buckets[key]) buckets[key] = new Set();
      buckets[key].add(String(value));
    }
  }
  return Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, [...v].sort()]));
}

function buildReadyProduct(hit, catalog) {
  const variants = hit.variants.map((variant) => {
    const dbMatch = checkVariantExists(catalog, variant);
    return {
      ...variant,
      dedupe_key: variantDedupeKey({ ...variant, model: hit.target_model }),
      db_status: dbMatch.exists ? "exists" : "new",
      db_match: dbMatch.exists ? dbMatch : null,
    };
  });

  const parentPayload = {
    source: "yerevanmobile",
    model: hit.target_model,
    product_name: hit.target_model,
    product_title: hit.product_title,
    source_urls: [hit.source_url],
    source_language: hit.source_language,
    source_sku: hit.source_sku,
    variants,
    variant_count: variants.length,
    price_min: Math.min(...variants.map((v) => v.price)),
    price_max: Math.max(...variants.map((v) => v.price)),
    available_options: summarizeOptions(variants),
  };

  const parentDup = checkProductExists(catalog, parentPayload);
  const newVariants = variants.filter((v) => v.db_status === "new");

  if (parentDup.exists) {
    return {
      bucket: "already_exists_or_duplicate",
      row: {
        product: hit.target_model,
        product_title: hit.product_title,
        existing_db_product: parentDup.product?.title,
        db_id: parentDup.product?.id,
        reason: parentDup.reason,
        source_url: hit.source_url,
        notes: "Parent model already exists in DB — skipped as duplicate",
      },
    };
  }

  if (!newVariants.length) {
    return {
      bucket: "already_exists_or_duplicate",
      row: {
        product: hit.target_model,
        existing_db_product: variants[0]?.db_match?.product?.title,
        reason: "all_variants_exist_in_db",
        source_url: hit.source_url,
      },
    };
  }

  return {
    bucket: "ready_to_import",
    product: {
      ...parentPayload,
      variants: newVariants,
      variant_count: newVariants.length,
      ready_to_import: true,
    },
  };
}

function writeReport(payload, exitCode) {
  const s = payload.summary;
  const lines = [
    "# YerevanMobile Samsung Missing Models Check",
    "",
    `> Generated: ${payload.generated_at}`,
    "> Mode: read-only audit — no DB import performed",
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| YerevanMobile scope models checked | ${s.target_scope_models} |`,
    `| Found exact models | ${s.found_exact_models} |`,
    `| Ready to import parents | ${s.ready_to_import_parent_products} |`,
    `| Ready variants | ${s.ready_to_import_variants} |`,
    `| Found but not imported | ${s.found_but_not_imported} |`,
    `| Not found | ${s.not_found} |`,
    `| Already exists / duplicate | ${s.already_exists_or_duplicate} |`,
    `| Rejected | ${s.rejected} |`,
    "",
    "## Ready To Import",
    "",
    "| Target model | Product title | Variants | Price range | Source URLs |",
    "| --- | --- | ---: | ---: | --- |",
  ];

  if (!payload.ready_to_import.length) lines.push("| — | — | — | — | — |");
  for (const product of payload.ready_to_import) {
    lines.push(
      `| ${product.model} | ${product.product_title} | ${product.variant_count} | ${product.price_min.toLocaleString()}–${product.price_max.toLocaleString()} AMD | ${product.source_urls[0]} |`,
    );
  }

  lines.push("", "## Found But Not Imported", "", "| Target model | Product title | Source URL | Reason |", "| --- | --- | --- | --- |");
  if (!payload.found_but_not_imported.length) lines.push("| — | — | — | — |");
  for (const row of payload.found_but_not_imported) {
    lines.push(`| ${row.target_model} | ${row.product_title || "—"} | ${row.source_url || "—"} | ${row.reason} |`);
  }

  lines.push("", "## Not Found", "", "| Target model | Checked paths/searches | Notes |", "| --- | --- | --- |");
  for (const row of payload.not_found) {
    lines.push(`| ${row.target_model} | ${row.checked_paths?.length || 0} URLs | ${row.notes || ""} |`);
  }

  lines.push("", "## Already Exists / Duplicate", "", "| Product | Source title | Existing DB product | Reason |", "| --- | --- | --- | --- |");
  if (!payload.already_exists_or_duplicate.length) lines.push("| — | — | — | — |");
  for (const row of payload.already_exists_or_duplicate) {
    lines.push(`| ${row.product} | ${row.product_title || "—"} | ${row.existing_db_product || "—"} | ${row.reason} |`);
  }

  lines.push("", "## Rejected", "", "| Product title | Source URL | Reason |", "| --- | --- | --- |");
  if (!payload.rejected.length) lines.push("| — | — | — |");
  for (const row of payload.rejected.slice(0, 40)) {
    lines.push(`| ${row.product_title || row.target_model || "—"} | ${row.source_url || "—"} | ${row.reason} |`);
  }

  lines.push("", "## Variant Summary", "", "| Product | Variants | Storage | RAM | Colors | Connectivity |", "| --- | ---: | --- | --- | --- | --- |");
  for (const product of payload.ready_to_import) {
    const opts = product.available_options || {};
    lines.push(
      `| ${product.model} | ${product.variant_count} | ${(opts.storage || []).join(", ") || "—"} | ${(opts.ram || []).join(", ") || "—"} | ${(opts.color || []).join(", ") || "—"} | ${(opts.connectivity || []).join(", ") || "—"} |`,
    );
  }
  if (!payload.ready_to_import.length) lines.push("| — | — | — | — | — | — |");

  lines.push(
    "",
    "## 5G vs Non-5G Handling",
    "",
    "- Non-5G YerevanMobile pages import as separate parent models (`Samsung Galaxy A36`, not `Samsung Galaxy A36 5G`).",
    "- `4G` in source title (e.g. `Samsung Galaxy A07 4G`) maps to parent `Samsung Galaxy A07` with connectivity attribute `4G`.",
    "- `5G` in source title remains part of the parent model name when explicitly present.",
    "- Non-5G models are never renamed or normalized into 5G models.",
    "- 5G-only targets with no explicit 5G page on YerevanMobile are listed under **Not Found**.",
    "",
  );

  const safety = payload.safety_checks || {};
  lines.push("", "## Safety Checks", "", "| Check | Result |", "| --- | --- |");
  for (const [label, result] of Object.entries(safety)) {
    lines.push(`| ${label} | ${result} |`);
  }

  lines.push("", "## Commands Used", "");
  for (const cmd of payload.commands || []) {
    lines.push(`- \`${cmd.command}\` → exit ${cmd.exit_code}`);
  }

  lines.push("", "## Final Recommendation", "");
  if (s.ready_to_import_parent_products > 0) {
    lines.push(
      `- **${s.ready_to_import_parent_products}** parent product(s) and **${s.ready_to_import_variants}** variant(s) are ready for review/import from YerevanMobile.`,
    );
    lines.push(`- **${s.found_but_not_imported}** target(s) were found but blocked (missing price/image or unsafe).`);
    lines.push(`- **${s.not_found}** target(s) have no matching product page on YerevanMobile (includes all 5G-only A-series without explicit 5G pages).`);
    lines.push("- DB import was **not** run in this task. Review dry-run JSON first.");
    lines.push("- Proposed next step after review: create/run `scripts/product-import/pipelines/samsung/import-yerevanmobile-missing.cjs --dry-run` for ready items only.");
  } else {
    lines.push("- No YerevanMobile products are ready to import for the 11 missing whitelist models.");
    lines.push(`- **${s.not_found}** targets remain not found on YerevanMobile; **${s.found_but_not_imported}** were found but blocked.`);
  }
  lines.push("");

  fs.writeFileSync(path.join(OUT_DIR, "yerevanmobile-samsung-missing-report.md"), lines.join("\n"), "utf8");
  return exitCode;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const catalog = await loadExistingCatalog();

  const readyToImport = [];
  const foundButNotImported = [];
  const notFound = [];
  const alreadyExists = [];
  const rejected = [];
  let foundExact = 0;

  for (const targetModel of TARGET_MODELS) {
    console.log(`[check] ${targetModel}`);
    const result = await searchTargetModel(targetModel);

    if (result.not_found) {
      notFound.push({
        target_model: targetModel,
        checked_paths: result.checked_paths,
        notes: "No exact product page found on YerevanMobile",
      });
      rejected.push(...(result.rejected || []));
      continue;
    }

    if (result.found_but_not_imported) {
      foundButNotImported.push(result.found_but_not_imported);
      rejected.push(...(result.rejected || []));
      continue;
    }

    foundExact += 1;
    const built = buildReadyProduct(result, catalog);
    if (built.bucket === "ready_to_import") readyToImport.push(built.product);
    else alreadyExists.push(built.row);
    rejected.push(...(result.rejected || []));
  }

  const readyVariants = readyToImport.reduce((sum, p) => sum + p.variant_count, 0);
  const payload = {
    generated_at: new Date().toISOString(),
    summary: {
      source: "yerevanmobile",
      target_scope_models: TARGET_MODELS.length,
      found_exact_models: foundExact,
      ready_to_import_parent_products: readyToImport.length,
      ready_to_import_variants: readyVariants,
      found_but_not_imported: foundButNotImported.length,
      not_found: notFound.length,
      already_exists_or_duplicate: alreadyExists.length,
      rejected: rejected.length,
    },
    ready_to_import: readyToImport,
    found_but_not_imported: foundButNotImported,
    not_found: notFound,
    already_exists_or_duplicate: alreadyExists,
    rejected,
    safety_checks: {
      "No hard-reject models accepted": readyToImport.every((p) => !isHardRejected(p.product_title, p.model)) ? "PASS" : "FAIL",
      "No accessories accepted": readyToImport.every((p) => !isAccessory(p.product_title, p.model)) ? "PASS" : "FAIL",
      "YerevanMobile scope models checked": TARGET_MODELS.length === YEREVANMOBILE_IMPORT_SCOPE.length ? "PASS" : "FAIL",
      "5G and non-5G kept separate": readyToImport.every((p) => {
        if (/\b5g\b/i.test(p.model)) return /\b5g\b/i.test(p.model);
        return !/\b5g\b/i.test(p.product_title);
      }) ? "PASS" : "FAIL",
      "No DB duplicate in ready list": readyToImport.every((p) => !checkProductExists(catalog, p).exists) ? "PASS" : "FAIL",
      "Price exists for ready products": readyToImport.every((p) => p.price_min >= MIN_PHONE_PRICE_AMD) ? "PASS" : "FAIL",
      "Image exists for ready products": readyToImport.every((p) => p.variants.every((v) => v.image_url || v.gallery?.length)) ? "PASS" : "FAIL",
    },
    commands: [
      {
        command: "node scripts/product-import/pipelines/samsung/yerevanmobile-missing-check.cjs",
        exit_code: 0,
      },
    ],
  };

  fs.writeFileSync(
    path.join(OUT_DIR, "yerevanmobile-samsung-missing.dry-run.json"),
    JSON.stringify(payload, null, 2),
    "utf8",
  );

  console.log("\nSummary:", JSON.stringify(payload.summary, null, 2));
  writeReport(payload, 0);
  console.log("Report:", path.join(OUT_DIR, "yerevanmobile-samsung-missing-report.md"));
}

if (require.main === module) {
  main().catch((error) => {
    console.error("FATAL:", error.message);
    process.exit(1);
  });
}

module.exports = {
  searchTargetModel,
  buildReadyProduct,
  gatherCandidateUrls,
  probeUrl,
  MIN_PHONE_PRICE_AMD,
};
