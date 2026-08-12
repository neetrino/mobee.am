/**
 * Marco → Mobee product importer.
 *
 * Default: dry-run (no Mobee writes).
 * Apply writes CREATE-only with --apply (never updates existing Mobee products).
 * Unsafe CREATE rows (missing SKU and/or price <= 0) are excluded from writes.
 *
 * Usage:
 *   node scripts/import-marco-products.cjs
 *   node scripts/import-marco-products.cjs --group=samsung-tv --limit=10
 *   node scripts/import-marco-products.cjs --apply --group=samsung-tv
 *
 * Source: MARCO_DIRECT_URL (READ ONLY)
 * Target: DIRECT_URL
 */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Client } = require("pg");
const {
  GROUPS,
  GROUP_KEYS,
  categoryMatchesGroup,
  normalizeText,
} = require("./lib/marco/groups.constants.cjs");

const SOURCE_NAME = "marco";
const STOCK_SENTINEL = 100000;
/** Marco stores AMD in full units; Mobee catalog prices are AMD / 1000. */
const MARCO_PRICE_TO_MOBEE_DIVISOR = 1000;
const REPORT_PATH = path.join(
  process.cwd(),
  "scripts",
  "import-marco-products.dry-run.json"
);

/**
 * Explicit CREATE exclusions: missing SKU + price 0 (do not invent values).
 * Kept as a hard denylist in addition to the generic safety gate.
 */
const UNSAFE_CREATE_MARCO_PRODUCT_IDS = new Set([
  "cmpphlcv4079zhtkb5wny80qr", // MIDEA AF-24N8D0
  "cmppffhyi07um4c5zmdecwwj8", // HISENSE AS18UW4SMSKC02G
  "cmppfffgn07ti4c5zuawemcpx", // HISENSE AS12HR4SV DDE (black)
  "cmppff4pr07os4c5zmoedzwkq", // HISENSE AS24UW4SBTKC00A
  "cmppff0xj07ns4c5zvy2qmr7w", // HISENSE AS12HR4SYRCA01
]);

function planHasTruthySku(plan) {
  return (plan.variants || []).some(
    (v) => typeof v.sku === "string" && v.sku.trim().length > 0
  );
}

function planHasPositivePrice(plan) {
  return (plan.variants || []).some((v) => Number(v.price) > 0);
}

/**
 * CREATE rows that must never be written: denylist and/or missing SKU / price.
 */
function getUnsafeCreateReasons(plan) {
  if (plan.action !== "CREATE") return [];
  const reasons = [];
  if (UNSAFE_CREATE_MARCO_PRODUCT_IDS.has(plan.marcoProductId)) {
    reasons.push("EXPLICIT_UNSAFE_DENYLIST");
  }
  if (!planHasTruthySku(plan)) reasons.push("MISSING_SKU");
  if (!planHasPositivePrice(plan)) reasons.push("PRICE_ZERO_OR_MISSING");
  return reasons;
}

function isSafeCreateWriteCandidate(plan) {
  return plan.action === "CREATE" && getUnsafeCreateReasons(plan).length === 0;
}

function loadEnv(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function parseArgs(argv) {
  const args = {
    apply: false,
    group: null,
    limit: null,
    sourceProductId: null,
    help: false,
  };
  for (const raw of argv) {
    if (raw === "--apply") args.apply = true;
    else if (raw.startsWith("--group=")) args.group = raw.slice("--group=".length).trim();
    else if (raw.startsWith("--limit=")) {
      const n = Number(raw.slice("--limit=".length));
      if (!Number.isFinite(n) || n < 1) throw new Error("Invalid --limit");
      args.limit = Math.floor(n);
    } else if (raw.startsWith("--source-product-id=")) {
      args.sourceProductId = raw.slice("--source-product-id=".length).trim();
      if (!args.sourceProductId) throw new Error("Invalid --source-product-id");
    } else if (raw === "--help" || raw === "-h") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${raw}`);
    }
  }
  return args;
}

function hostOf(url) {
  try {
    return new URL(url.replace(/^postgresql:/i, "http:")).host;
  } catch {
    return "unknown-host";
  }
}

function createId() {
  return `c${Date.now().toString(36)}${crypto.randomBytes(8).toString("hex")}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function descriptionToHtml(description) {
  if (description == null) return null;
  if (typeof description === "string") {
    const trimmed = description.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("<")) return trimmed;
    return `<p>${escapeHtml(trimmed)}</p>`;
  }
  if (Array.isArray(description)) {
    const rows = description
      .filter((item) => item && (item.title || item.value))
      .map(
        (item) =>
          `<tr><th>${escapeHtml(item.title || "")}</th><td>${escapeHtml(
            item.value || ""
          )}</td></tr>`
      )
      .join("");
    if (!rows) return null;
    return `<table class="product-specs"><tbody>${rows}</tbody></table>`;
  }
  if (typeof description === "object") {
    if (typeof description.html === "string") return description.html;
    if (Array.isArray(description.items)) return descriptionToHtml(description.items);
  }
  return null;
}

function normalizeMedia(media, alt = "") {
  if (!Array.isArray(media)) return [];
  const out = [];
  for (const item of media) {
    if (typeof item === "string" && item.trim()) {
      out.push({ url: item.trim(), alt: alt || "" });
      continue;
    }
    if (item && typeof item === "object") {
      const url = item.url || item.src || item.value;
      if (typeof url === "string" && url.trim()) {
        out.push({
          url: url.trim(),
          alt: typeof item.alt === "string" ? item.alt : alt || "",
        });
      }
    }
  }
  return out;
}

/** Build SQL expression that turns a jsonb JSON-array param into jsonb[]. */
function jsonbArrayParam(paramIndex) {
  return `COALESCE(
    (
      SELECT array_agg(elem)
      FROM jsonb_array_elements($${paramIndex}::jsonb) AS elem
    ),
    ARRAY[]::jsonb[]
  )::jsonb[]`;
}

function normalizeStock(stock) {
  const n = Number(stock);
  if (n === STOCK_SENTINEL) {
    return { stock: 0, warning: "STOCK_REVIEW_REQUIRED" };
  }
  return { stock: Number.isFinite(n) ? n : 0, warning: null };
}

/**
 * Convert Marco money (full AMD) to Mobee catalog units (AMD / 1000).
 * Keeps up to 2 decimal places.
 */
function toMobeePrice(marcoAmount) {
  if (marcoAmount == null) return null;
  const n = Number(marcoAmount);
  if (!Number.isFinite(n)) return null;
  return Math.round((n / MARCO_PRICE_TO_MOBEE_DIVISOR) * 100) / 100;
}

function compareAtFromMarco(variant) {
  const price = Number(variant.price);
  if (!Number.isFinite(price)) return null;
  const discountType = String(variant.discountType || "").toUpperCase();
  const discountValue = Number(variant.discountValue);
  if (!Number.isFinite(discountValue) || discountValue <= 0) return null;
  let marcoCompare = null;
  if (discountType === "AMOUNT") marcoCompare = price + discountValue;
  else if (discountType === "PERCENT" && discountValue < 100) {
    marcoCompare = Math.round((price / (1 - discountValue / 100)) * 100) / 100;
  }
  return toMobeePrice(marcoCompare);
}

function productCategoryIds(product) {
  const ids = new Set();
  if (product.primaryCategoryId) ids.add(product.primaryCategoryId);
  if (Array.isArray(product.categoryIds)) {
    for (const id of product.categoryIds) if (id) ids.add(id);
  }
  if (Array.isArray(product.join_category_ids)) {
    for (const id of product.join_category_ids) if (id) ids.add(id);
  }
  return [...ids];
}

function createClient(connectionString) {
  return new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
    statement_timeout: 120000,
  });
}

async function loadCategorySummaries(client) {
  const { rows } = await client.query(`
    SELECT
      c.id,
      c."parentId",
      ct.locale,
      ct.title,
      ct.slug AS translation_slug,
      ct."fullPath"
    FROM categories c
    LEFT JOIN category_translations ct ON ct."categoryId" = c.id
    WHERE c."deletedAt" IS NULL
    ORDER BY c.id, ct.locale
  `);

  const byId = new Map();
  for (const row of rows) {
    if (!byId.has(row.id)) {
      byId.set(row.id, {
        id: row.id,
        parentId: row.parentId,
        slug: row.translation_slug || "",
        title: "",
        titles: [],
        slugs: [],
        paths: [],
      });
    }
    const cat = byId.get(row.id);
    if (row.title) cat.titles.push({ locale: row.locale, title: row.title });
    if (row.translation_slug) {
      cat.slugs.push(row.translation_slug);
      if (!cat.slug) cat.slug = row.translation_slug;
    }
    if (row.fullPath) cat.paths.push(row.fullPath);
  }

  function display(cat) {
    return (
      cat.titles.find((t) => t.locale === "ru")?.title ||
      cat.titles.find((t) => t.locale === "en")?.title ||
      cat.titles.find((t) => t.locale === "hy")?.title ||
      cat.titles[0]?.title ||
      cat.slug ||
      cat.id
    );
  }

  function pathOf(catId, guard = new Set()) {
    const cat = byId.get(catId);
    if (!cat || guard.has(catId)) return "";
    if (cat.paths.length > 0) return cat.paths[0];
    guard.add(catId);
    const self = display(cat);
    if (!cat.parentId) return self;
    const parent = pathOf(cat.parentId, guard);
    return parent ? `${parent} > ${self}` : self;
  }

  return [...byId.values()].map((cat) => {
    const title = display(cat);
    return {
      id: cat.id,
      slug: cat.slug || cat.slugs[0] || "",
      title,
      path: pathOf(cat.id) || cat.paths[0] || "",
      titles: cat.titles,
      slugs: cat.slugs,
      parentId: cat.parentId,
    };
  });
}

async function loadBrandsByAliases(client, aliases) {
  const { rows } = await client.query(
    `
    SELECT
      b.id,
      b.slug,
      COALESCE(
        (
          SELECT bt.name
          FROM brand_translations bt
          WHERE bt."brandId" = b.id
          ORDER BY CASE bt.locale
            WHEN 'en' THEN 1
            WHEN 'ru' THEN 2
            WHEN 'hy' THEN 3
            ELSE 4
          END
          LIMIT 1
        ),
        b.slug
      ) AS name
    FROM brands b
    WHERE b."deletedAt" IS NULL
      AND (
        lower(regexp_replace(coalesce(b.slug, ''), '\\s+', ' ', 'g')) = ANY($1::text[])
        OR EXISTS (
          SELECT 1
          FROM brand_translations bt
          WHERE bt."brandId" = b.id
            AND lower(regexp_replace(coalesce(bt.name, ''), '\\s+', ' ', 'g')) = ANY($1::text[])
        )
      )
    ORDER BY name
    `,
    [aliases.map((a) => normalizeText(a))]
  );
  return rows;
}

async function loadMobeeAttributes(client) {
  const { rows } = await client.query(`
    SELECT a.id, a.key
    FROM attributes a
    ORDER BY a.key
  `);
  const byKey = new Map();
  for (const row of rows) byKey.set(normalizeText(row.key), row);
  return byKey;
}

async function loadMobeeAttributeValues(client) {
  const { rows } = await client.query(`
    SELECT
      av.id,
      av."attributeId",
      av.value,
      COALESCE(
        (
          SELECT avt.label
          FROM attribute_value_translations avt
          WHERE avt."attributeValueId" = av.id
          ORDER BY CASE avt.locale
            WHEN 'en' THEN 1
            WHEN 'ru' THEN 2
            WHEN 'hy' THEN 3
            ELSE 4
          END
          LIMIT 1
        ),
        av.value
      ) AS label
    FROM attribute_values av
  `);
  const byAttr = new Map();
  for (const row of rows) {
    if (!byAttr.has(row.attributeId)) byAttr.set(row.attributeId, []);
    byAttr.get(row.attributeId).push(row);
  }
  return byAttr;
}

async function tableExists(client, tableName) {
  const { rows } = await client.query(
    `
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = $1
    LIMIT 1
    `,
    [tableName]
  );
  return rows.length > 0;
}

async function fetchMarcoProducts(marco, group, brandId, categoryIdSet) {
  const hasJoin = await tableExists(marco, "_ProductCategories");
  const joinSelect = hasJoin
    ? `,
      (
        SELECT COALESCE(array_agg(DISTINCT pc."B"), ARRAY[]::text[])
        FROM "_ProductCategories" pc
        WHERE pc."A" = p.id
      ) AS join_category_ids`
    : `, ARRAY[]::text[] AS join_category_ids`;

  const { rows } = await marco.query(
    `
    SELECT
      p.id,
      p."brandId",
      p."skuPrefix",
      p.published,
      p.featured,
      p."publishedAt",
      p."deletedAt",
      p."primaryCategoryId",
      p."categoryIds",
      p."attributeIds",
      p.media,
      p."createdAt",
      p."updatedAt",
      b.slug AS brand_slug,
      COALESCE(
        (
          SELECT bt.name
          FROM brand_translations bt
          WHERE bt."brandId" = b.id
          ORDER BY CASE bt.locale
            WHEN 'en' THEN 1
            WHEN 'ru' THEN 2
            WHEN 'hy' THEN 3
            ELSE 4
          END
          LIMIT 1
        ),
        b.slug
      ) AS brand_name,
      (
        SELECT json_agg(json_build_object(
          'locale', t.locale,
          'title', t.title,
          'slug', t.slug,
          'subtitle', t.subtitle,
          'description', t.description,
          'seoTitle', t."seoTitle",
          'seoDescription', t."seoDescription"
        ) ORDER BY t.locale)
        FROM product_translations t
        WHERE t."productId" = p.id
      ) AS translations,
      (
        SELECT json_agg(json_build_object(
          'id', v.id,
          'sku', v.sku,
          'barcode', v.barcode,
          'price', v.price,
          'cost', v.cost,
          'stock', v.stock,
          'stockReserved', v."stockReserved",
          'weightGrams', v."weightGrams",
          'imageUrl', v."imageUrl",
          'position', v.position,
          'published', v.published,
          'attributes', v.attributes,
          'discountType', v."discountType",
          'discountValue', v."discountValue"
        ) ORDER BY v.position, v.id)
        FROM product_variants v
        WHERE v."productId" = p.id
      ) AS variants,
      (
        SELECT COALESCE(json_agg(json_build_object(
          'type', l.type,
          'value', l.value,
          'position', l.position,
          'color', l.color
        ) ORDER BY l.id), '[]'::json)
        FROM product_labels l
        WHERE l."productId" = p.id
      ) AS labels,
      (
        SELECT COALESCE(json_agg(pa."attributeId"), '[]'::json)
        FROM product_attributes pa
        WHERE pa."productId" = p.id
      ) AS linked_attribute_ids
      ${joinSelect}
    FROM products p
    JOIN brands b ON b.id = p."brandId"
    WHERE p."brandId" = $1
      AND p."deletedAt" IS NULL
    ORDER BY p."createdAt" DESC
    `,
    [brandId]
  );

  const matched = [];
  for (const product of rows) {
    const catIds = productCategoryIds(product);
    const inCategory = catIds.some((id) => categoryIdSet.has(id));
    if (!inCategory) continue;
    matched.push(product);
  }
  return matched;
}

async function fetchVariantOptions(marco, variantIds) {
  if (!variantIds.length) return new Map();
  const { rows } = await marco.query(
    `
    SELECT
      o."variantId",
      o."attributeId",
      o."attributeKey",
      o."valueId",
      o.value
    FROM product_variant_options o
    WHERE o."variantId" = ANY($1::text[])
    ORDER BY o.id
    `,
    [variantIds]
  );
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.variantId)) map.set(row.variantId, []);
    map.get(row.variantId).push(row);
  }
  return map;
}

async function fetchMarcoAttributeKeys(marco, attributeIds) {
  if (!attributeIds.length) return new Map();
  const { rows } = await marco.query(
    `
    SELECT id, key
    FROM attributes
    WHERE id = ANY($1::text[])
    `,
    [attributeIds]
  );
  return new Map(rows.map((r) => [r.id, r.key]));
}

/**
 * Business rule: only unpublished Marco products are SKIP.
 * price=0 / stock anomalies / missing media / missing variants are NOT skip reasons.
 */
function classifyProduct(product) {
  if (!product.published) {
    return { action: "SKIP", reason: "UNPUBLISHED" };
  }
  return { action: "CANDIDATE", reason: null };
}

function defaultVariantSourcePid(marcoProductId) {
  return `marco-product-${marcoProductId}-default`;
}

function resolveDefaultVariantSku(product, title) {
  const prefix =
    typeof product.skuPrefix === "string" ? product.skuPrefix.trim() : "";
  if (prefix) return prefix;
  const model = String(title || product.id)
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return model || `marco-${product.id}`;
}

function buildDefaultVariantPlan(product, title, existingBySource, existingBySku) {
  const sourcePid = defaultVariantSourcePid(product.id);
  const sku = resolveDefaultVariantSku(product, title);
  const bySource = existingBySource.get(sourcePid) || null;
  const bySku = sku && existingBySku.get(sku) ? existingBySku.get(sku) : null;

  let conflictReason = null;
  if (bySku && (!bySource || bySku.id !== bySource.id)) {
    if (bySku.source === SOURCE_NAME && bySku.sourcePid) {
      conflictReason = "SKU_BELONGS_TO_OTHER_MARCO_VARIANT";
    } else if (bySku.source !== SOURCE_NAME) {
      conflictReason = "SKU_CONFLICT_NON_MARCO";
    } else if (!bySource) {
      conflictReason = "SKU_EXISTS_WITHOUT_SOURCE_MATCH";
    }
  }

  return {
    conflictReason,
    variant: {
      marcoVariantId: null,
      generatedDefault: true,
      source: SOURCE_NAME,
      sourcePid,
      sku,
      barcode: null,
      price: 0,
      compareAtPrice: null,
      cost: null,
      stock: 0,
      stockReserved: 0,
      weightGrams: null,
      imageUrl: null,
      position: 0,
      published: true,
      attributes: null,
      options: [],
      existingVariantId: bySource?.id || null,
      existingProductId: bySource?.productId || null,
      skuOwner: bySku
        ? {
            variantId: bySku.id,
            productId: bySku.productId,
            source: bySku.source,
            sourcePid: bySku.sourcePid,
          }
        : null,
    },
  };
}

function pickTitle(translations) {
  const list = Array.isArray(translations) ? translations : [];
  return (
    list.find((t) => t.locale === "en")?.title ||
    list.find((t) => t.locale === "ru")?.title ||
    list.find((t) => t.locale === "hy")?.title ||
    list[0]?.title ||
    null
  );
}

function mapOptions(marcoOptions, attrByKey, valuesByAttr) {
  const mapped = [];
  const warnings = [];
  for (const opt of marcoOptions || []) {
    const key = normalizeText(opt.attributeKey);
    const mobeeAttr = key ? attrByKey.get(key) : null;
    let valueId = null;
    if (mobeeAttr && valuesByAttr.has(mobeeAttr.id)) {
      const needle = normalizeText(opt.value);
      const found = valuesByAttr.get(mobeeAttr.id).find(
        (v) =>
          normalizeText(v.value) === needle || normalizeText(v.label) === needle
      );
      valueId = found?.id || null;
    }
    if (!mobeeAttr) {
      warnings.push(`ATTRIBUTE_UNMAPPED:${opt.attributeKey || "unknown"}`);
      // Keep key/value without FK ids — do not invent Attribute/AttributeValue.
      mapped.push({
        attributeId: null,
        attributeKey: opt.attributeKey || null,
        valueId: null,
        value: opt.value || null,
        skipFkRelation: false,
      });
      continue;
    }
    mapped.push({
      attributeId: mobeeAttr.id,
      attributeKey: opt.attributeKey || null,
      valueId,
      value: opt.value || null,
      skipFkRelation: false,
    });
  }
  return { mapped, warnings };
}

function serializeApplyError(err) {
  const rawMessage = String(err?.message || err || "Unknown error");
  const message = rawMessage
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_DB_URL]")
    .replace(/\/\/[^:@\s]+:[^@\s]+@/g, "//[REDACTED]@");
  return {
    name: err?.name || "Error",
    message,
    code: err?.code || null,
    constraint: err?.constraint || null,
    table: err?.table || null,
    column: err?.column || null,
    detail: err?.detail || null,
    hint: err?.hint || null,
    stack: typeof err?.stack === "string" ? err.stack.split("\n").slice(0, 12).join("\n") : null,
  };
}

function printApplyError(plan, safeError) {
  console.error("\n[APPLY_ERROR]");
  console.error(`group: ${plan.group}`);
  console.error(`sourceProductId: ${plan.marcoProductId}`);
  console.error(`title: ${plan.title || ""}`);
  console.error(`plannedAction: ${plan.action}`);
  console.error(`error.name: ${safeError.name}`);
  console.error(`error.message: ${safeError.message}`);
  console.error(`error.code: ${safeError.code || ""}`);
  console.error(`error.constraint: ${safeError.constraint || ""}`);
  console.error(`error.table: ${safeError.table || ""}`);
  console.error(`error.column: ${safeError.column || ""}`);
  console.error(`error.detail: ${safeError.detail || ""}`);
  console.error(`error.hint: ${safeError.hint || ""}`);
  console.error(`error.stack:\n${safeError.stack || ""}`);
}

async function verifyCreateRollback(mobee, productId, sourcePids, hasJoinTable) {
  const checks = {
    productAbsent: true,
    translationsAbsent: true,
    labelsAbsent: true,
    productAttributesAbsent: true,
    variantsAbsent: true,
    optionsAbsent: true,
    categoryRelationsAbsent: true,
  };

  if (productId) {
    const product = await mobee.query(`SELECT id FROM products WHERE id = $1`, [
      productId,
    ]);
    checks.productAbsent = product.rows.length === 0;

    const translations = await mobee.query(
      `SELECT id FROM product_translations WHERE "productId" = $1 LIMIT 1`,
      [productId]
    );
    checks.translationsAbsent = translations.rows.length === 0;

    const labels = await mobee.query(
      `SELECT id FROM product_labels WHERE "productId" = $1 LIMIT 1`,
      [productId]
    );
    checks.labelsAbsent = labels.rows.length === 0;

    const attrs = await mobee.query(
      `SELECT id FROM product_attributes WHERE "productId" = $1 LIMIT 1`,
      [productId]
    );
    checks.productAttributesAbsent = attrs.rows.length === 0;

    if (hasJoinTable) {
      const joinRows = await mobee.query(
        `SELECT 1 FROM "_ProductCategories" WHERE "A" = $1 LIMIT 1`,
        [productId]
      );
      checks.categoryRelationsAbsent = joinRows.rows.length === 0;
    }
  }

  if (sourcePids.length > 0) {
    const variants = await mobee.query(
      `
      SELECT id
      FROM product_variants
      WHERE source = $1
        AND "sourcePid" = ANY($2::text[])
      `,
      [SOURCE_NAME, sourcePids]
    );
    checks.variantsAbsent = variants.rows.length === 0;
    if (variants.rows.length > 0) {
      const variantIds = variants.rows.map((r) => r.id);
      const options = await mobee.query(
        `
        SELECT id
        FROM product_variant_options
        WHERE "variantId" = ANY($1::text[])
        LIMIT 1
        `,
        [variantIds]
      );
      checks.optionsAbsent = options.rows.length === 0;
    }
  }

  return {
    rollbackVerified: Object.values(checks).every(Boolean),
    checks,
  };
}

function summarizeSelection(plans, args) {
  const rawCandidates = plans.length;
  const skippedUnpublished = plans.filter(
    (p) => p.action === "SKIP" && p.reason === "UNPUBLISHED"
  ).length;
  const publishedCandidates = plans.filter((p) => p.action !== "SKIP").length;
  const createTotal = plans.filter((p) => p.action === "CREATE").length;
  const updateExisting = plans.filter((p) => p.action === "UPDATE").length;
  const excludedUnsafeCreates = plans
    .filter((p) => p.action === "CREATE" && !isSafeCreateWriteCandidate(p))
    .map((p) => ({
      group: p.group,
      marcoProductId: p.marcoProductId,
      title: p.title,
      reasons: getUnsafeCreateReasons(p),
      hasSku: planHasTruthySku(p),
      hasPositivePrice: planHasPositivePrice(p),
    }));

  // CREATE-only: never write UPDATE/EXISTING. Exclude unsafe CREATEs.
  let writeCandidates = plans.filter((p) => isSafeCreateWriteCandidate(p));
  if (args.sourceProductId) {
    writeCandidates = writeCandidates.filter(
      (p) => p.marcoProductId === args.sourceProductId
    );
  }
  const selectedForApply =
    args.limit != null ? writeCandidates.slice(0, args.limit) : writeCandidates;

  const zeroPriceWriteCandidates = writeCandidates.filter(
    (p) => !planHasPositivePrice(p)
  ).length;
  const missingSkuWriteCandidates = writeCandidates.filter(
    (p) => !planHasTruthySku(p)
  ).length;

  return {
    rawCandidates,
    publishedCandidates,
    createTotal,
    updateExisting,
    updateWriteCandidates: 0,
    excludedUnsafeCreate: excludedUnsafeCreates.length,
    excludedUnsafeCreates,
    writeCandidates: writeCandidates.length,
    selectedForApply: selectedForApply.length,
    zeroPriceWriteCandidates,
    missingSkuWriteCandidates,
    skippedUnpublished,
    selectedPlans: selectedForApply,
    writePlans: writeCandidates,
  };
}

function mapAttributeIds(marcoAttrIds, marcoKeyById, attrByKey) {
  const mapped = [];
  const warnings = [];
  for (const marcoAttrId of marcoAttrIds || []) {
    const key = marcoKeyById.get(marcoAttrId);
    if (!key) {
      warnings.push(`ATTRIBUTE_ID_UNKNOWN:${marcoAttrId}`);
      continue;
    }
    const mobee = attrByKey.get(normalizeText(key));
    if (!mobee) {
      warnings.push(`ATTRIBUTE_UNMAPPED:${key}`);
      continue;
    }
    mapped.push(mobee.id);
  }
  return { mapped: [...new Set(mapped)], warnings };
}

async function lookupExistingBySource(mobee, sourcePids) {
  if (!sourcePids.length) return new Map();
  const { rows } = await mobee.query(
    `
    SELECT id, "productId", sku, source, "sourcePid", price, stock
    FROM product_variants
    WHERE source = $1
      AND "sourcePid" = ANY($2::text[])
    `,
    [SOURCE_NAME, sourcePids]
  );
  return new Map(rows.map((r) => [r.sourcePid, r]));
}

async function lookupExistingBySku(mobee, skus) {
  const cleaned = [...new Set(skus.filter((s) => typeof s === "string" && s.trim()))];
  if (!cleaned.length) return new Map();
  const { rows } = await mobee.query(
    `
    SELECT id, "productId", sku, source, "sourcePid"
    FROM product_variants
    WHERE sku = ANY($1::text[])
    `,
    [cleaned]
  );
  return new Map(rows.map((r) => [r.sku, r]));
}

async function slugTaken(mobee, locale, slug, excludeProductId = null) {
  const { rows } = await mobee.query(
    `
    SELECT "productId"
    FROM product_translations
    WHERE locale = $1 AND slug = $2
    LIMIT 1
    `,
    [locale, slug]
  );
  if (!rows.length) return false;
  if (excludeProductId && rows[0].productId === excludeProductId) return false;
  return true;
}

async function resolveUniqueSlug(mobee, locale, baseSlug, excludeProductId = null) {
  let slug = baseSlug || `marco-${locale}-${createId()}`;
  let i = 1;
  while (await slugTaken(mobee, locale, slug, excludeProductId)) {
    slug = `${baseSlug}-${i++}`;
  }
  return slug;
}

function buildPlanItem({
  group,
  product,
  brandMapping,
  categoryMapping,
  existingBySource,
  existingBySku,
  optionMap,
  attrMap,
}) {
  const warnings = [];
  const title = pickTitle(product.translations);
  // Never import Marco media/images — Mobee uses official manufacturer photos only.
  const media = [];
  if (countMedia(normalizeMedia(product.media, title || "")) > 0) {
    warnings.push("MARCO_MEDIA_SKIPPED");
  }
  const classification = classifyProduct(product);

  if (!brandMapping?.mobeeBrandId) {
    return {
      action: "CONFLICT",
      reason: "MISSING_BRAND",
      group: group.key,
      marcoProductId: product.id,
      title,
      warnings,
    };
  }
  if (!categoryMapping?.mobeeCategoryId) {
    return {
      action: "CONFLICT",
      reason: "MISSING_CATEGORY",
      group: group.key,
      marcoProductId: product.id,
      title,
      warnings,
    };
  }
  if (classification.action === "SKIP") {
    return {
      action: "SKIP",
      reason: classification.reason,
      group: group.key,
      marcoProductId: product.id,
      title,
      warnings,
    };
  }

  if (media.length === 0) warnings.push("NO_MEDIA");

  const variantsPlan = [];
  let existingProductId = null;
  let hasSourceHit = false;
  let hasConflict = false;
  let conflictReason = null;
  const sourceVariants = Array.isArray(product.variants) ? product.variants : [];

  function noteSourceHit(bySource) {
    if (!bySource) return;
    hasSourceHit = true;
    if (!existingProductId) existingProductId = bySource.productId;
    else if (existingProductId !== bySource.productId) {
      hasConflict = true;
      conflictReason = "SOURCE_VARIANTS_SPLIT_ACROSS_PRODUCTS";
    }
  }

  function noteSkuConflict(bySku, bySource) {
    if (!bySku || (bySource && bySku.id === bySource.id)) return;
    if (bySku.source === SOURCE_NAME && bySku.sourcePid) {
      hasConflict = true;
      conflictReason = "SKU_BELONGS_TO_OTHER_MARCO_VARIANT";
    } else if (bySku.source !== SOURCE_NAME) {
      hasConflict = true;
      conflictReason = "SKU_CONFLICT_NON_MARCO";
    } else if (!bySource) {
      hasConflict = true;
      conflictReason = "SKU_EXISTS_WITHOUT_SOURCE_MATCH";
    }
  }

  if (sourceVariants.length === 0) {
    const generated = buildDefaultVariantPlan(
      product,
      title,
      existingBySource,
      existingBySku
    );
    warnings.push("GENERATED_DEFAULT_VARIANT");
    warnings.push("PRICE_ZERO");
    if (generated.conflictReason) {
      hasConflict = true;
      conflictReason = generated.conflictReason;
    }
    noteSourceHit(
      generated.variant.existingVariantId
        ? {
            id: generated.variant.existingVariantId,
            productId: generated.variant.existingProductId,
          }
        : null
    );
    variantsPlan.push(generated.variant);
  } else {
    for (const variant of sourceVariants) {
      const stockInfo = normalizeStock(variant.stock);
      if (stockInfo.warning) warnings.push(stockInfo.warning);

      const price = Number(variant.price);
      const safePrice = Number.isFinite(price)
        ? toMobeePrice(price)
        : 0;
      if (safePrice === 0) warnings.push("PRICE_ZERO");

      const opts = mapOptions(
        optionMap.get(variant.id) || [],
        attrMap.attrByKey,
        attrMap.valuesByAttr
      );
      warnings.push(...opts.warnings);

      const sourcePid = String(variant.id);
      const bySource = existingBySource.get(sourcePid) || null;
      const bySku =
        variant.sku && existingBySku.get(variant.sku)
          ? existingBySku.get(variant.sku)
          : null;

      noteSourceHit(bySource);
      noteSkuConflict(bySku, bySource);

      const costMobee = toMobeePrice(variant.cost);

      variantsPlan.push({
        marcoVariantId: variant.id,
        generatedDefault: false,
        source: SOURCE_NAME,
        sourcePid,
        sku: variant.sku || null,
        barcode: variant.barcode || null,
        price: safePrice ?? 0,
        compareAtPrice: compareAtFromMarco(variant),
        cost: costMobee,
        stock: stockInfo.stock,
        stockReserved: Number(variant.stockReserved) || 0,
        weightGrams: variant.weightGrams,
        imageUrl: null,
        position: variant.position || 0,
        published: variant.published !== false,
        attributes: variant.attributes || null,
        options: opts.mapped,
        existingVariantId: bySource?.id || null,
        existingProductId: bySource?.productId || null,
        skuOwner: bySku
          ? {
              variantId: bySku.id,
              productId: bySku.productId,
              source: bySku.source,
              sourcePid: bySku.sourcePid,
            }
          : null,
      });
    }
  }

  const attrIds = [
    ...new Set([
      ...(Array.isArray(product.attributeIds) ? product.attributeIds : []),
      ...(Array.isArray(product.linked_attribute_ids)
        ? product.linked_attribute_ids
        : []),
    ]),
  ];
  const mappedAttrs = mapAttributeIds(
    attrIds,
    attrMap.marcoKeyById,
    attrMap.attrByKey
  );
  warnings.push(...mappedAttrs.warnings);

  const translations = (product.translations || []).map((t) => ({
    locale: t.locale,
    title: t.title,
    slug: t.slug,
    subtitle: t.subtitle || null,
    descriptionHtml: descriptionToHtml(t.description),
    seoTitle: t.seoTitle || null,
    seoDescription: t.seoDescription || null,
  }));

  // Ensure Mobee always has hy/en/ru title rows (fallback copy from best available).
  {
    const byLocale = new Map(translations.map((t) => [t.locale, t]));
    const source =
      byLocale.get("en") ||
      byLocale.get("hy") ||
      byLocale.get("ru") ||
      translations[0] ||
      null;
    if (source && source.title) {
      for (const locale of ["hy", "en", "ru"]) {
        if (byLocale.has(locale) && String(byLocale.get(locale).title || "").trim()) {
          continue;
        }
        byLocale.set(locale, {
          ...source,
          locale,
          slug: source.slug ? `${source.slug}-${locale}` : source.slug,
        });
      }
      translations.length = 0;
      translations.push(...byLocale.values());
    }
  }

  if (hasConflict) {
    return {
      action: "CONFLICT",
      reason: conflictReason || "CONFLICT",
      group: group.key,
      marcoProductId: product.id,
      title,
      brandId: brandMapping.mobeeBrandId,
      categoryId: categoryMapping.mobeeCategoryId,
      variants: variantsPlan,
      translations,
      media,
      warnings: [...new Set(warnings)],
    };
  }

  const action = hasSourceHit ? "UPDATE" : "CREATE";
  return {
    action,
    reason: action === "UPDATE" ? "EXISTING_SOURCE_PID" : "NEW",
    group: group.key,
    marcoProductId: product.id,
    existingProductId,
    title,
    brandId: brandMapping.mobeeBrandId,
    brandSlug: brandMapping.mobeeBrandSlug,
    categoryId: categoryMapping.mobeeCategoryId,
    categoryTitle: categoryMapping.mobeeCategoryTitle,
    skuPrefix: product.skuPrefix || null,
    // Preserve Marco published=true; do not flip due to price/stock/media.
    published: true,
    featured: Boolean(product.featured),
    discountPercent: 0,
    media,
    labels: Array.isArray(product.labels) ? product.labels : [],
    attributeIds: mappedAttrs.mapped,
    translations,
    variants: variantsPlan,
    warnings: [...new Set(warnings)],
    skippedFields: [
      "productClass",
      "warrantyYears",
      "product_listing_rows",
      "product_pdp_rows",
      "reviews",
    ],
  };
}

async function applyCreate(mobee, plan, hasJoinTable) {
  const productId = createId();
  const now = new Date();

  await mobee.query("BEGIN");
  try {
    await mobee.query(
      `
      INSERT INTO products (
        id, "brandId", "skuPrefix", media, published, featured, "publishedAt",
        "categoryIds", "primaryCategoryId", "attributeIds", "discountPercent",
        "createdAt", "updatedAt"
      ) VALUES (
        $1,$2,$3,${jsonbArrayParam(4)},$5,$6,$7,$8,$9,$10,$11,$12,$12
      )
      `,
      [
        productId,
        plan.brandId,
        plan.skuPrefix,
        JSON.stringify(plan.media),
        true,
        plan.featured,
        now,
        [plan.categoryId],
        plan.categoryId,
        plan.attributeIds,
        plan.discountPercent,
        now,
      ]
    );

    if (hasJoinTable) {
      await mobee.query(
        `INSERT INTO "_ProductCategories" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [productId, plan.categoryId]
      );
    }

    for (const tr of plan.translations) {
      const slug = await resolveUniqueSlug(mobee, tr.locale, tr.slug, null);
      await mobee.query(
        `
        INSERT INTO product_translations (
          id, "productId", locale, title, slug, subtitle, "descriptionHtml",
          "seoTitle", "seoDescription"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `,
        [
          createId(),
          productId,
          tr.locale,
          tr.title,
          slug,
          tr.subtitle,
          tr.descriptionHtml,
          tr.seoTitle,
          tr.seoDescription,
        ]
      );
    }

    for (const label of plan.labels) {
      await mobee.query(
        `
        INSERT INTO product_labels (id, "productId", type, value, position, color)
        VALUES ($1,$2,$3,$4,$5,$6)
        `,
        [
          createId(),
          productId,
          label.type,
          label.value,
          label.position || "top-left",
          label.color || null,
        ]
      );
    }

    for (const attributeId of plan.attributeIds) {
      await mobee.query(
        `
        INSERT INTO product_attributes (id, "productId", "attributeId", "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$4)
        ON CONFLICT ("productId", "attributeId") DO NOTHING
        `,
        [createId(), productId, attributeId, now]
      );
    }

    for (const variant of plan.variants) {
      const variantId = createId();
      await mobee.query(
        `
        INSERT INTO product_variants (
          id, "productId", sku, barcode, price, "compareAtPrice", cost, stock,
          "stockReserved", "weightGrams", "imageUrl", media, position, published,
          attributes, source, "sourcePid", "createdAt", "updatedAt"
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,ARRAY[]::jsonb[],$12,$13,$14::jsonb,$15,$16,$17,$17
        )
        `,
        [
          variantId,
          productId,
          variant.sku,
          variant.barcode,
          variant.price,
          variant.compareAtPrice,
          variant.cost,
          variant.stock,
          variant.stockReserved,
          variant.weightGrams,
          variant.imageUrl,
          variant.position,
          variant.published,
          variant.attributes ? JSON.stringify(variant.attributes) : null,
          SOURCE_NAME,
          variant.sourcePid,
          now,
        ]
      );

      for (const opt of variant.options || []) {
        if (opt.skipFkRelation) continue;
        await mobee.query(
          `
          INSERT INTO product_variant_options (
            id, "variantId", "attributeId", "attributeKey", "valueId", value
          ) VALUES ($1,$2,$3,$4,$5,$6)
          `,
          [
            createId(),
            variantId,
            opt.attributeId,
            opt.attributeKey,
            opt.valueId,
            opt.value,
          ]
        );
      }
    }

    await mobee.query("COMMIT");
    return {
      productId,
      r2Uploaded: false,
      r2RolledBack: false,
      orphanedR2Objects: [],
    };
  } catch (err) {
    await mobee.query("ROLLBACK");
    err.applyProductId = productId;
    throw err;
  }
}

async function applyUpdate(mobee, plan, hasJoinTable) {
  const productId = plan.existingProductId;
  if (!productId) throw new Error("UPDATE without existingProductId");
  const now = new Date();

  await mobee.query("BEGIN");
  try {
    await mobee.query(
      `
      UPDATE products SET
        "brandId" = $2,
        "skuPrefix" = $3,
        media = ${jsonbArrayParam(4)},
        published = true,
        featured = $5,
        "primaryCategoryId" = $6,
        "categoryIds" = $7,
        "attributeIds" = $8,
        "discountPercent" = $9,
        "updatedAt" = $10,
        "deletedAt" = NULL
      WHERE id = $1
      `,
      [
        productId,
        plan.brandId,
        plan.skuPrefix,
        JSON.stringify(plan.media),
        plan.featured,
        plan.categoryId,
        [plan.categoryId],
        plan.attributeIds,
        plan.discountPercent,
        now,
      ]
    );

    if (hasJoinTable) {
      await mobee.query(`DELETE FROM "_ProductCategories" WHERE "A" = $1`, [
        productId,
      ]);
      await mobee.query(
        `INSERT INTO "_ProductCategories" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [productId, plan.categoryId]
      );
    }

    for (const tr of plan.translations) {
      const slug = await resolveUniqueSlug(mobee, tr.locale, tr.slug, productId);
      const existing = await mobee.query(
        `
        SELECT id FROM product_translations
        WHERE "productId" = $1 AND locale = $2
        LIMIT 1
        `,
        [productId, tr.locale]
      );
      if (existing.rows[0]) {
        await mobee.query(
          `
          UPDATE product_translations SET
            title = $3,
            slug = $4,
            subtitle = $5,
            "descriptionHtml" = $6,
            "seoTitle" = $7,
            "seoDescription" = $8
          WHERE id = $1
          `,
          [
            existing.rows[0].id,
            productId,
            tr.title,
            slug,
            tr.subtitle,
            tr.descriptionHtml,
            tr.seoTitle,
            tr.seoDescription,
          ]
        );
      } else {
        await mobee.query(
          `
          INSERT INTO product_translations (
            id, "productId", locale, title, slug, subtitle, "descriptionHtml",
            "seoTitle", "seoDescription"
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          `,
          [
            createId(),
            productId,
            tr.locale,
            tr.title,
            slug,
            tr.subtitle,
            tr.descriptionHtml,
            tr.seoTitle,
            tr.seoDescription,
          ]
        );
      }
    }

    await mobee.query(`DELETE FROM product_labels WHERE "productId" = $1`, [
      productId,
    ]);
    for (const label of plan.labels) {
      await mobee.query(
        `
        INSERT INTO product_labels (id, "productId", type, value, position, color)
        VALUES ($1,$2,$3,$4,$5,$6)
        `,
        [
          createId(),
          productId,
          label.type,
          label.value,
          label.position || "top-left",
          label.color || null,
        ]
      );
    }

    await mobee.query(`DELETE FROM product_attributes WHERE "productId" = $1`, [
      productId,
    ]);
    for (const attributeId of plan.attributeIds) {
      await mobee.query(
        `
        INSERT INTO product_attributes (id, "productId", "attributeId", "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$4)
        ON CONFLICT ("productId", "attributeId") DO NOTHING
        `,
        [createId(), productId, attributeId, now]
      );
    }

    for (const variant of plan.variants) {
      let variantId = variant.existingVariantId;
      if (variantId) {
        await mobee.query(
          `
          UPDATE product_variants SET
            sku = COALESCE($2, sku),
            barcode = $3,
            price = $4,
            "compareAtPrice" = $5,
            cost = $6,
            stock = $7,
            "stockReserved" = $8,
            "weightGrams" = $9,
            "imageUrl" = $10,
            position = $11,
            published = $12,
            attributes = $13::jsonb,
            source = $14,
            "sourcePid" = $15,
            "updatedAt" = $16
          WHERE id = $1
          `,
          [
            variantId,
            variant.sku,
            variant.barcode,
            variant.price,
            variant.compareAtPrice,
            variant.cost,
            variant.stock,
            variant.stockReserved,
            variant.weightGrams,
            variant.imageUrl,
            variant.position,
            variant.published,
            variant.attributes ? JSON.stringify(variant.attributes) : null,
            SOURCE_NAME,
            variant.sourcePid,
            now,
          ]
        );
        await mobee.query(
          `DELETE FROM product_variant_options WHERE "variantId" = $1`,
          [variantId]
        );
      } else {
        variantId = createId();
        await mobee.query(
          `
          INSERT INTO product_variants (
            id, "productId", sku, barcode, price, "compareAtPrice", cost, stock,
            "stockReserved", "weightGrams", "imageUrl", media, position, published,
            attributes, source, "sourcePid", "createdAt", "updatedAt"
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,ARRAY[]::jsonb[],$12,$13,$14::jsonb,$15,$16,$17,$17
          )
          `,
          [
            variantId,
            productId,
            variant.sku,
            variant.barcode,
            variant.price,
            variant.compareAtPrice,
            variant.cost,
            variant.stock,
            variant.stockReserved,
            variant.weightGrams,
            variant.imageUrl,
            variant.position,
            variant.published,
            variant.attributes ? JSON.stringify(variant.attributes) : null,
            SOURCE_NAME,
            variant.sourcePid,
            now,
          ]
        );
      }

      for (const opt of variant.options || []) {
        if (opt.skipFkRelation) continue;
        await mobee.query(
          `
          INSERT INTO product_variant_options (
            id, "variantId", "attributeId", "attributeKey", "valueId", value
          ) VALUES ($1,$2,$3,$4,$5,$6)
          `,
          [
            createId(),
            variantId,
            opt.attributeId,
            opt.attributeKey,
            opt.valueId,
            opt.value,
          ]
        );
      }
    }

    await mobee.query("COMMIT");
    return {
      productId,
      r2Uploaded: false,
      r2RolledBack: false,
      orphanedR2Objects: [],
    };
  } catch (err) {
    await mobee.query("ROLLBACK");
    err.applyProductId = productId;
    throw err;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage:
  node scripts/import-marco-products.cjs [--group=<name>] [--limit=<n>] [--source-product-id=<id>] [--apply]

Groups: ${GROUP_KEYS.join(", ")}
Default mode: dry-run (writes report only). Without --group, all ${GROUP_KEYS.length} brand×category groups are evaluated.
--limit applies only to safe CREATE write candidates (UPDATE/SKIP/CONFLICT/unsafe CREATE do not consume it).
--apply inserts safe CREATE products only; existing Mobee products are never updated.`);
    return;
  }

  if (args.group && !GROUPS[args.group]) {
    throw new Error(
      `Unknown group "${args.group}". Supported: ${GROUP_KEYS.join(", ")}`
    );
  }

  const env = loadEnv(path.join(process.cwd(), ".env"));
  const marcoUrl = env.MARCO_DIRECT_URL;
  const mobeeUrl = env.DIRECT_URL;

  if (!marcoUrl) throw new Error("Missing MARCO_DIRECT_URL");
  if (!mobeeUrl) throw new Error("Missing DIRECT_URL");

  const selectedGroups = args.group
    ? [GROUPS[args.group]]
    : Object.values(GROUPS);

  const marco = createClient(marcoUrl);
  const mobee = createClient(mobeeUrl);

  const report = {
    mode: args.apply ? "APPLY" : "DRY_RUN",
    generatedAt: new Date().toISOString(),
    marcoSourceEnv: "MARCO_DIRECT_URL",
    mobeeTargetEnv: "DIRECT_URL",
    marcoHost: hostOf(marcoUrl),
    mobeeHost: hostOf(mobeeUrl),
    marcoReadOnly: true,
    writes: Boolean(args.apply),
    args: {
      group: args.group,
      limit: args.limit,
      sourceProductId: args.sourceProductId,
      apply: args.apply,
    },
    brandCategoryMapping: {},
    selection: null,
    counts: {
      candidates: 0,
      CREATE: 0,
      UPDATE: 0,
      SKIP: 0,
      CONFLICT: 0,
    },
    skipOnlyUnpublishedConfirmed: false,
    byGroup: {},
    priceZeroProducts: [],
    stockZeroProducts: [],
    stockSentinelProducts: [],
    defaultVariantPlans: [],
    products: [],
    applyResults: {
      appliedCreate: 0,
      appliedUpdate: 0,
      applyErrors: 0,
      errors: [],
      items: [],
      r2Uploaded: false,
      r2RolledBack: false,
      orphanedR2Objects: [],
      r2Note:
        "Importer reuses existing Marco media URLs; no R2 upload is performed in this script.",
    },
  };

  await marco.connect();
  await mobee.connect();

  try {
    await marco.query("BEGIN READ ONLY");
    // Dry-run and apply both inspect Mobee first in read-only fashion for planning.
    await mobee.query("BEGIN READ ONLY");

    const marcoCategories = await loadCategorySummaries(marco);
    const mobeeCategories = await loadCategorySummaries(mobee);
    const attrByKey = await loadMobeeAttributes(mobee);
    const valuesByAttr = await loadMobeeAttributeValues(mobee);
    const hasJoinTable = await tableExists(mobee, "_ProductCategories");

    const allAlias = [
      ...new Set(selectedGroups.flatMap((g) => g.brandAliases)),
    ];
    const marcoBrands = await loadBrandsByAliases(marco, allAlias);
    const mobeeBrands = await loadBrandsByAliases(mobee, allAlias);

    const marcoBrandByAlias = new Map();
    for (const b of marcoBrands) {
      marcoBrandByAlias.set(normalizeText(b.name), b);
      marcoBrandByAlias.set(normalizeText(b.slug), b);
    }
    const mobeeBrandByAlias = new Map();
    for (const b of mobeeBrands) {
      mobeeBrandByAlias.set(normalizeText(b.name), b);
      mobeeBrandByAlias.set(normalizeText(b.slug), b);
    }

    const plans = [];
    const seenMarcoProductIds = new Map(); // marcoProductId -> first group key
    const crossGroupDuplicates = [];

    // Ensure every selected group appears in byGroup (including zero matches).
    for (const group of selectedGroups) {
      report.byGroup[group.key] = {
        brand: group.brand,
        categoryLabel: group.categoryLabel,
        categoryKey: group.categoryKey,
        CREATE: 0,
        UPDATE: 0,
        SKIP: 0,
        CONFLICT: 0,
        rawCandidates: 0,
        publishedCandidates: 0,
        writeCandidates: 0,
        skippedUnpublished: 0,
        selectedForApply: 0,
        crossGroupDuplicateSkipped: 0,
        sampleTitles: [],
      };
    }

    for (const group of selectedGroups) {
      const marcoBrand =
        group.brandAliases
          .map((a) => marcoBrandByAlias.get(normalizeText(a)))
          .find(Boolean) || null;
      const mobeeBrand =
        group.brandAliases
          .map((a) => mobeeBrandByAlias.get(normalizeText(a)))
          .find(Boolean) || null;

      const marcoMatchedCats = marcoCategories.filter((c) =>
        categoryMatchesGroup(group, c)
      );
      const mobeeMatchedCats = mobeeCategories.filter((c) =>
        categoryMatchesGroup(group, c)
      );
      // Prefer leaf/non-apple category for TVs etc.
      const mobeeCategory =
        mobeeMatchedCats.find(
          (c) => !normalizeText(c.slug).includes("apple")
        ) ||
        mobeeMatchedCats[0] ||
        null;

      report.brandCategoryMapping[group.key] = {
        brand: group.brand,
        categoryLabel: group.categoryLabel,
        marcoBrand: marcoBrand
          ? { id: marcoBrand.id, slug: marcoBrand.slug, name: marcoBrand.name }
          : null,
        mobeeBrand: mobeeBrand
          ? { id: mobeeBrand.id, slug: mobeeBrand.slug, name: mobeeBrand.name }
          : null,
        marcoCategories: marcoMatchedCats.map((c) => ({
          id: c.id,
          title: c.title,
          slug: c.slug,
          path: c.path,
        })),
        mobeeCategories: mobeeMatchedCats.map((c) => ({
          id: c.id,
          title: c.title,
          slug: c.slug,
          path: c.path,
        })),
        selectedMobeeCategory: mobeeCategory
          ? {
              id: mobeeCategory.id,
              title: mobeeCategory.title,
              slug: mobeeCategory.slug,
            }
          : null,
      };

      if (!marcoBrand) {
        continue;
      }

      const categoryIdSet = new Set(marcoMatchedCats.map((c) => c.id));
      const products = await fetchMarcoProducts(
        marco,
        group,
        marcoBrand.id,
        categoryIdSet
      );

      const allVariantIds = [];
      const allAttrIds = new Set();
      const sourcePids = [];
      const skus = [];
      for (const product of products) {
        const variants = Array.isArray(product.variants) ? product.variants : [];
        for (const v of variants) {
          allVariantIds.push(v.id);
          sourcePids.push(String(v.id));
          if (v.sku) skus.push(v.sku);
        }
        if (variants.length === 0) {
          sourcePids.push(defaultVariantSourcePid(product.id));
          const title = pickTitle(product.translations);
          skus.push(resolveDefaultVariantSku(product, title));
        }
        for (const id of product.attributeIds || []) allAttrIds.add(id);
        for (const id of product.linked_attribute_ids || []) allAttrIds.add(id);
      }

      const optionMap = await fetchVariantOptions(marco, allVariantIds);
      const marcoKeyById = await fetchMarcoAttributeKeys(marco, [...allAttrIds]);

      const existingBySource = await lookupExistingBySource(mobee, sourcePids);
      const existingBySku = await lookupExistingBySku(mobee, skus);

      for (const product of products) {
        if (seenMarcoProductIds.has(product.id)) {
          const firstGroup = seenMarcoProductIds.get(product.id);
          crossGroupDuplicates.push({
            marcoProductId: product.id,
            title: pickTitle(product.translations),
            keptGroup: firstGroup,
            skippedGroup: group.key,
          });
          report.byGroup[group.key].crossGroupDuplicateSkipped += 1;
          continue;
        }
        seenMarcoProductIds.set(product.id, group.key);

        const plan = buildPlanItem({
          group,
          product,
          brandMapping: {
            mobeeBrandId: mobeeBrand?.id || null,
            mobeeBrandSlug: mobeeBrand?.slug || null,
          },
          categoryMapping: {
            mobeeCategoryId: mobeeCategory?.id || null,
            mobeeCategoryTitle: mobeeCategory?.title || null,
          },
          existingBySource,
          existingBySku,
          optionMap,
          attrMap: { attrByKey, valuesByAttr, marcoKeyById },
        });
        plans.push(plan);
        if (
          report.byGroup[group.key].sampleTitles.length < 5 &&
          plan.title
        ) {
          report.byGroup[group.key].sampleTitles.push(plan.title);
        }
      }
    }

    await mobee.query("COMMIT");
    await marco.query("COMMIT");

    for (const plan of plans) {
      report.counts.candidates += 1;
      report.counts[plan.action] = (report.counts[plan.action] || 0) + 1;
      report.products.push(plan);

      if (!report.byGroup[plan.group]) {
        report.byGroup[plan.group] = {
          CREATE: 0,
          UPDATE: 0,
          SKIP: 0,
          CONFLICT: 0,
          rawCandidates: 0,
          publishedCandidates: 0,
          writeCandidates: 0,
          skippedUnpublished: 0,
          selectedForApply: 0,
        };
      }
      report.byGroup[plan.group][plan.action] =
        (report.byGroup[plan.group][plan.action] || 0) + 1;
      report.byGroup[plan.group].rawCandidates += 1;
      if (plan.action === "SKIP" && plan.reason === "UNPUBLISHED") {
        report.byGroup[plan.group].skippedUnpublished += 1;
      } else if (plan.action !== "SKIP") {
        report.byGroup[plan.group].publishedCandidates += 1;
      }
      if (isSafeCreateWriteCandidate(plan)) {
        report.byGroup[plan.group].writeCandidates += 1;
      }

      if (
        plan.action === "CREATE" ||
        plan.action === "UPDATE" ||
        plan.action === "CONFLICT"
      ) {
        const hasPriceZero = (plan.variants || []).some(
          (v) => Number(v.price) === 0
        );
        const hasStockZero = (plan.variants || []).some(
          (v) => Number(v.stock) === 0
        );
        const hasStockSentinel = (plan.warnings || []).includes(
          "STOCK_REVIEW_REQUIRED"
        );
        if (hasPriceZero || (plan.warnings || []).includes("PRICE_ZERO")) {
          report.priceZeroProducts.push({
            group: plan.group,
            marcoProductId: plan.marcoProductId,
            title: plan.title,
            warnings: plan.warnings,
          });
        }
        if (hasStockZero) {
          report.stockZeroProducts.push({
            group: plan.group,
            marcoProductId: plan.marcoProductId,
            title: plan.title,
          });
        }
        if (hasStockSentinel) {
          report.stockSentinelProducts.push({
            group: plan.group,
            marcoProductId: plan.marcoProductId,
            title: plan.title,
          });
        }
        for (const variant of plan.variants || []) {
          if (variant.generatedDefault) {
            report.defaultVariantPlans.push({
              group: plan.group,
              marcoProductId: plan.marcoProductId,
              title: plan.title,
              variant,
            });
          }
        }
      }
    }

    const selection = summarizeSelection(plans, args);
    report.selection = {
      rawCandidates: selection.rawCandidates,
      publishedCandidates: selection.publishedCandidates,
      createTotal: selection.createTotal,
      updateExisting: selection.updateExisting,
      updateWriteCandidates: selection.updateWriteCandidates,
      excludedUnsafeCreate: selection.excludedUnsafeCreate,
      excludedUnsafeCreates: selection.excludedUnsafeCreates,
      writeCandidates: selection.writeCandidates,
      selectedForApply: selection.selectedForApply,
      zeroPriceWriteCandidates: selection.zeroPriceWriteCandidates,
      missingSkuWriteCandidates: selection.missingSkuWriteCandidates,
      skippedUnpublished: selection.skippedUnpublished,
      selectedProducts: selection.selectedPlans.map((p) => ({
        group: p.group,
        action: p.action,
        marcoProductId: p.marcoProductId,
        title: p.title,
        published: p.published !== false,
      })),
    };
    for (const plan of selection.selectedPlans) {
      if (report.byGroup[plan.group]) {
        report.byGroup[plan.group].selectedForApply += 1;
      }
    }

    const skipPlans = report.products.filter((p) => p.action === "SKIP");
    report.skipOnlyUnpublishedConfirmed =
      skipPlans.length === 0 ||
      skipPlans.every((p) => p.reason === "UNPUBLISHED");
    report.skipReasons = [...new Set(skipPlans.map((p) => p.reason))];

    // Data-quality + matrix summary (dry-run and apply).
    const skuToPlans = new Map();
    let withoutSku = 0;
    let withoutPrice = 0;
    let withoutImage = 0;
    for (const plan of report.products) {
      const variants = Array.isArray(plan.variants) ? plan.variants : [];
      const mediaCount = countMedia(plan.media);
      if (mediaCount === 0) withoutImage += 1;
      if (!variants.length) {
        withoutSku += 1;
        withoutPrice += 1;
        continue;
      }
      let planHasSku = false;
      let planHasPrice = false;
      for (const v of variants) {
        if (v.sku) {
          planHasSku = true;
          if (!skuToPlans.has(v.sku)) skuToPlans.set(v.sku, []);
          skuToPlans.get(v.sku).push({
            marcoProductId: plan.marcoProductId,
            group: plan.group,
            title: plan.title,
            action: plan.action,
          });
        }
        if (v.price != null && Number(v.price) > 0) planHasPrice = true;
      }
      if (!planHasSku) withoutSku += 1;
      if (!planHasPrice) withoutPrice += 1;
    }
    const duplicateSkuGroups = [...skuToPlans.entries()]
      .filter(([, rows]) => {
        const productIds = new Set(rows.map((r) => r.marcoProductId));
        return productIds.size > 1 || rows.length > 1;
      })
      .map(([sku, rows]) => ({
        sku,
        occurrences: rows.length,
        uniqueProducts: [...new Set(rows.map((r) => r.marcoProductId))].length,
        rows,
      }));

    report.crossGroupDuplicates = crossGroupDuplicates;
    report.quality = {
      uniqueMarcoProducts: seenMarcoProductIds.size,
      matchedProducts: report.products.length,
      newProducts: report.counts.CREATE || 0,
      alreadyExisting: report.counts.UPDATE || 0,
      conflicts: report.counts.CONFLICT || 0,
      skipped: report.counts.SKIP || 0,
      crossGroupDuplicateSkipped: crossGroupDuplicates.length,
      withoutSku,
      withoutPrice,
      withoutImage,
      duplicateSkuGroupCount: duplicateSkuGroups.length,
      duplicateSkuGroups: duplicateSkuGroups.slice(0, 50),
    };

    report.matrix = GROUP_KEYS.map((key) => {
      const g = GROUPS[key];
      const row = report.byGroup[key] || {
        CREATE: 0,
        UPDATE: 0,
        SKIP: 0,
        CONFLICT: 0,
        rawCandidates: 0,
      };
      return {
        group: key,
        brand: g.brand,
        category: g.categoryLabel,
        categoryKey: g.categoryKey,
        found: row.rawCandidates || 0,
        new: row.CREATE || 0,
        existing: row.UPDATE || 0,
        skip: row.SKIP || 0,
        conflict: row.CONFLICT || 0,
        crossGroupDuplicateSkipped: row.crossGroupDuplicateSkipped || 0,
        sampleTitles: row.sampleTitles || [],
      };
    });

    if (args.apply) {
      const unsafeSelected = selection.selectedPlans.filter(
        (p) => !isSafeCreateWriteCandidate(p)
      );
      if (unsafeSelected.length > 0) {
        throw new Error(
          `Refusing --apply: ${unsafeSelected.length} non-safe CREATE plan(s) in selection`
        );
      }
      const nonCreateSelected = selection.selectedPlans.filter(
        (p) => p.action !== "CREATE"
      );
      if (nonCreateSelected.length > 0) {
        throw new Error(
          `Refusing --apply: ${nonCreateSelected.length} non-CREATE plan(s) in selection (CREATE-only)`
        );
      }

      for (const plan of selection.selectedPlans) {
        if (plan.action !== "CREATE" || !isSafeCreateWriteCandidate(plan)) {
          throw new Error(
            `Refusing write for ${plan.marcoProductId}: action=${plan.action}`
          );
        }
        const sourcePids = (plan.variants || []).map((v) => v.sourcePid);
        try {
          const result = await applyCreate(mobee, plan, hasJoinTable);
          report.applyResults.appliedCreate += 1;
          report.applyResults.items.push({
            action: plan.action,
            group: plan.group,
            marcoProductId: plan.marcoProductId,
            title: plan.title,
            mobeeProductId: result.productId,
            ok: true,
            rollbackVerified: null,
            r2Uploaded: result.r2Uploaded,
            r2RolledBack: result.r2RolledBack,
            orphanedR2Objects: result.orphanedR2Objects,
          });
        } catch (err) {
          const safeError = serializeApplyError(err);
          printApplyError(plan, safeError);
          report.applyResults.applyErrors += 1;

          let rollbackVerification = {
            rollbackVerified: false,
            checks: null,
            note: null,
          };
          try {
            rollbackVerification = await verifyCreateRollback(
              mobee,
              err.applyProductId || null,
              sourcePids,
              hasJoinTable
            );
          } catch (verifyErr) {
            rollbackVerification = {
              rollbackVerified: false,
              checks: null,
              note: `Rollback verify failed: ${verifyErr.message}`,
            };
          }

          report.applyResults.errors.push({
            group: plan.group,
            sourceProductId: plan.marcoProductId,
            title: plan.title,
            action: plan.action,
            name: safeError.name,
            message: safeError.message,
            code: safeError.code,
            constraint: safeError.constraint,
            table: safeError.table,
            column: safeError.column,
            detail: safeError.detail,
            hint: safeError.hint,
            rollbackVerified: rollbackVerification.rollbackVerified,
            rollbackChecks: rollbackVerification.checks,
            r2Uploaded: false,
            r2RolledBack: false,
            orphanedR2Objects: [],
          });
          report.applyResults.items.push({
            action: plan.action,
            group: plan.group,
            marcoProductId: plan.marcoProductId,
            title: plan.title,
            ok: false,
            error: safeError,
            rollbackVerified: rollbackVerification.rollbackVerified,
            rollbackChecks: rollbackVerification.checks,
            r2Uploaded: false,
            r2RolledBack: false,
            orphanedR2Objects: [],
          });

          process.exitCode = 1;
          if (args.limit === 1) break;
        }
      }
    }

    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");

    console.log("=== MARCO → MOBEE IMPORT ===");
    console.log(
      JSON.stringify(
        {
          mode: report.mode,
          marcoHost: report.marcoHost,
          mobeeHost: report.mobeeHost,
          marcoReadOnly: true,
          writes: report.writes,
          reportPath: REPORT_PATH,
        },
        null,
        2
      )
    );

    console.log("\n## Brand / category mapping");
    for (const [key, mapping] of Object.entries(report.brandCategoryMapping)) {
      console.log(`\n### ${key}`);
      console.log(
        `  Marco brand: ${
          mapping.marcoBrand
            ? `${mapping.marcoBrand.name} (${mapping.marcoBrand.slug})`
            : "MISSING"
        }`
      );
      console.log(
        `  Mobee brand: ${
          mapping.mobeeBrand
            ? `${mapping.mobeeBrand.name} (${mapping.mobeeBrand.slug})`
            : "MISSING — will not auto-create"
        }`
      );
      console.log(
        `  Marco categories: ${
          mapping.marcoCategories.map((c) => c.title).join(", ") || "none"
        }`
      );
      console.log(
        `  Mobee category: ${
          mapping.selectedMobeeCategory
            ? `${mapping.selectedMobeeCategory.title} [${mapping.selectedMobeeCategory.slug}]`
            : "MISSING — will not auto-create"
        }`
      );
    }

    console.log("\n## Counts");
    console.log(
      JSON.stringify(
        {
          CREATE: report.counts.CREATE,
          UPDATE: report.counts.UPDATE,
          SKIP: report.counts.SKIP,
          CONFLICT: report.counts.CONFLICT,
          candidates: report.counts.candidates,
        },
        null,
        2
      )
    );

    console.log("\n## Quality / dedup");
    console.log(JSON.stringify(report.quality, null, 2));

    console.log("\n## Brand × category matrix");
    console.log(
      "Brand".padEnd(10) +
        "Category".padEnd(22) +
        "Found".padStart(7) +
        "New".padStart(7) +
        "Existing".padStart(10) +
        "Skip".padStart(7) +
        "Conflict".padStart(10)
    );
    for (const row of report.matrix || []) {
      console.log(
        String(row.brand).padEnd(10) +
          String(row.category).padEnd(22) +
          String(row.found).padStart(7) +
          String(row.new).padStart(7) +
          String(row.existing).padStart(10) +
          String(row.skip).padStart(7) +
          String(row.conflict).padStart(10)
      );
    }

    console.log("\n## Selection");
    console.log(JSON.stringify(report.selection, null, 2));

    console.log("\n## By group (summary)");
    for (const row of report.matrix || []) {
      console.log(
        `- ${row.group}: found=${row.found} new=${row.new} existing=${row.existing} samples=${(row.sampleTitles || []).slice(0, 3).join(" | ") || "-"}`
      );
    }
    console.log("\n## SKIP policy");
    console.log(
      JSON.stringify(
        {
          onlyUnpublished: report.skipOnlyUnpublishedConfirmed,
          skipReasons: report.skipReasons,
        },
        null,
        2
      )
    );

    console.log(
      `\n## PRICE_ZERO products (${report.priceZeroProducts.length})`
    );
    for (const row of report.priceZeroProducts.slice(0, 20)) {
      console.log(`- ${row.group} | ${row.title} | ${row.marcoProductId}`);
    }

    console.log(
      `\n## Default variant plans (${report.defaultVariantPlans.length})`
    );
    for (const row of report.defaultVariantPlans) {
      console.log(
        `- ${row.group} | ${row.title} | sourcePid=${row.variant.sourcePid} | sku=${row.variant.sku}`
      );
    }

    console.log("\n## Sample products (up to 20)");
    for (const p of report.products.slice(0, 20)) {
      console.log(
        `- [${p.action}] ${p.group} | ${p.title || p.marcoProductId || "—"} | ${
          p.reason || ""
        }${p.warnings?.length ? ` | warnings=${p.warnings.join(",")}` : ""}`
      );
    }

    if (args.apply) {
      console.log("\n## Apply results");
      console.log(
        JSON.stringify(
          {
            appliedCreate: report.applyResults.appliedCreate,
            appliedUpdate: report.applyResults.appliedUpdate,
            applyErrors: report.applyResults.applyErrors,
            errors: report.applyResults.errors,
            items: report.applyResults.items,
            r2Uploaded: report.applyResults.r2Uploaded,
            r2RolledBack: report.applyResults.r2RolledBack,
            orphanedR2Objects: report.applyResults.orphanedR2Objects,
            r2Note: report.applyResults.r2Note,
          },
          null,
          2
        )
      );
    } else {
      console.log("\nDry-run only. No Mobee writes. Use --apply to write.");
    }
  } catch (err) {
    try {
      await marco.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    try {
      await mobee.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    await marco.end().catch(() => {});
    await mobee.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
