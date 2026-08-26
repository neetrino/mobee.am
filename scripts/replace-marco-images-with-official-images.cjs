"use strict";

/**
 * Replace Marco-imported product images with official manufacturer images.
 *
 * Default: dry-run (no writes, no deletes).
 *
 * Usage:
 *   node scripts/replace-marco-images-with-official-images.cjs
 *   node scripts/replace-marco-images-with-official-images.cjs --apply
 *   node scripts/replace-marco-images-with-official-images.cjs --apply --delete-old-images
 *   node scripts/replace-marco-images-with-official-images.cjs --brand=samsung --limit=5
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Client } = require("pg");
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const {
  OFFICIAL_SOURCES,
  BRAND_ALIASES,
  GROUP_TO_BRAND,
  GROUPS,
  GROUP_KEYS,
  ALLOWED_BRAND_KEYS,
  categoryMatchesGroup,
  OVERRIDES_PATH_REL,
  MIN_IMAGE_BYTES,
  MAX_OFFICIAL_IMAGES,
  APPROVED_PAGE_STATUSES,
  MANUAL_IMAGE_EVIDENCE_SET,
} = require("./lib/official-images/sources.constants.cjs");
const {
  extractModelFromTitle,
  normalizeModelKey,
  compactModel,
} = require("./lib/official-images/model.utils.cjs");
const {
  resolveOfficialProductPage,
  findOverrideEntryForTitle,
} = require("./lib/official-images/page-discovery.cjs");
const { extractOfficialImages } = require("./lib/official-images/page-extract.cjs");
const {
  hostnameOf,
  isBlockedImageHost,
} = require("./lib/official-images/domain.utils.cjs");
const {
  fetchHtml,
  fetchImage,
  headRequest,
  mapPool,
} = require("./lib/official-images/http.utils.cjs");
const {
  readImageDimensions,
  resolveMime,
  classifyResolution,
  sortValidatedForPrimary,
} = require("./lib/official-images/image-format.utils.cjs");
const {
  extractWithHeadlessBrowser,
} = require("./lib/official-images/headless-extract.cjs");

const SOURCE_NAME = "marco";
const DEFAULT_CONCURRENCY = 2;
const BACKUP_DIR = path.join(process.cwd(), "tmp", "official-images-backups");
const PREVIOUS_NOT_READY_PATH = path.join(
  process.cwd(),
  "tmp",
  "official-images-previous-not-ready.json"
);

let headlessLock = Promise.resolve();
function withHeadlessLock(fn) {
  const run = headlessLock.then(fn, fn);
  headlessLock = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}
const REPORT_PATH = path.join(
  process.cwd(),
  "scripts",
  "replace-marco-images-with-official-images.dry-run.json"
);
const CACHE_PATH = path.join(
  process.cwd(),
  "tmp",
  "official-images-cache.json"
);
const OVERRIDES_PATH = path.join(process.cwd(), OVERRIDES_PATH_REL);

const CONTENT_TYPE_EXT = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

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
    deleteOldImages: false,
    brand: null,
    group: null,
    productId: null,
    sourceProductId: null,
    models: null,
    productIds: null,
    limit: null,
    concurrency: DEFAULT_CONCURRENCY,
    help: false,
  };
  for (const raw of argv) {
    if (raw === "--apply") args.apply = true;
    else if (raw === "--delete-old-images") args.deleteOldImages = true;
    else if (raw.startsWith("--brand=")) {
      args.brand = raw.slice("--brand=".length).trim().toLowerCase();
      if (!OFFICIAL_SOURCES[args.brand]) {
        throw new Error(
          `Unknown brand. Supported: ${Object.keys(OFFICIAL_SOURCES).join(", ")}`
        );
      }
    } else if (raw.startsWith("--group=")) {
      args.group = raw.slice("--group=".length).trim();
      if (!GROUP_TO_BRAND[args.group]) {
        throw new Error(
          `Unknown group. Supported: ${Object.keys(GROUP_TO_BRAND).join(", ")}`
        );
      }
    } else if (raw.startsWith("--product-id=")) {
      args.productId = raw.slice("--product-id=".length).trim();
    } else if (raw.startsWith("--source-product-id=")) {
      args.sourceProductId = raw.slice("--source-product-id=".length).trim();
    } else if (raw.startsWith("--product-ids-file=")) {
      const filePath = path.resolve(raw.slice("--product-ids-file=".length).trim());
      const text = fs.readFileSync(filePath, "utf8");
      args.productIds = [
        ...new Set(
          text
            .split(/[\s,]+/)
            .map((s) => s.trim())
            .filter(Boolean)
        ),
      ];
      if (!args.productIds.length) throw new Error("Invalid --product-ids-file");
    } else if (raw.startsWith("--models=")) {
      const rawModels = raw.slice("--models=".length).trim();
      args.models = rawModels
        .split(",")
        .map((m) => compactModel(m.trim()))
        .filter(Boolean);
      if (!args.models.length) throw new Error("Invalid --models");
    } else if (raw.startsWith("--limit=")) {
      const n = Number(raw.slice("--limit=".length));
      if (!Number.isFinite(n) || n < 1) throw new Error("Invalid --limit");
      args.limit = Math.floor(n);
    } else if (raw.startsWith("--concurrency=")) {
      const n = Number(raw.slice("--concurrency=".length));
      if (!Number.isFinite(n) || n < 1) throw new Error("Invalid --concurrency");
      args.concurrency = Math.floor(n);
    } else if (raw === "--help" || raw === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${raw}`);
  }
  if (args.deleteOldImages && !args.apply) {
    throw new Error("--delete-old-images requires --apply");
  }
  if (args.brand && args.group && GROUP_TO_BRAND[args.group] !== args.brand) {
    throw new Error("--brand and --group disagree");
  }
  return args;
}

function printHelp() {
  console.log(`Replace Marco images with official brand images.

Default dry-run:
  node scripts/replace-marco-images-with-official-images.cjs

Apply:
  node scripts/replace-marco-images-with-official-images.cjs --apply
  node scripts/replace-marco-images-with-official-images.cjs --apply --delete-old-images

Filters:
  --brand=samsung|bosch|lg|hisense|midea
  --group=<one of ${GROUP_KEYS.length} brand×category keys>
  --product-id=<mobeeId>
  --source-product-id=<marcoId>
  --models=<csv>   (e.g. F2V7GW1W,WFQP6012EVM)
  --limit=<n>
  --concurrency=<n>   (default ${DEFAULT_CONCURRENCY})

Groups: ${GROUP_KEYS.join(", ")}
`);
}

function createDbClient(connectionString) {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
    statement_timeout: 180000,
  });
  // Neon may terminate idle connections during long HTTP discovery.
  client.on("error", (err) => {
    console.warn(`[db] ${err.message}`);
  });
  return client;
}

function createR2Client(env) {
  const accountId = env.R2_ACCOUNT_ID;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const bucket = env.R2_BUCKET_NAME;
  const publicUrl = env.R2_PUBLIC_URL;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new Error("Missing R2 env vars");
  }
  return {
    client: new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
    bucket,
    publicUrlBase: publicUrl.replace(/\/$/, ""),
    publicHost: new URL(publicUrl).host,
  };
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function resolveBrandKey(row) {
  const slug = normalizeText(row.brand_slug);
  const name = normalizeText(row.brand_name);
  for (const [key, aliases] of Object.entries(BRAND_ALIASES)) {
    if (aliases.includes(slug) || aliases.includes(name)) return key;
  }
  return null;
}

function loadCache() {
  try {
    if (!fs.existsSync(CACHE_PATH)) return {};
    return JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

function cacheKey(brand, model) {
  return `${brand}::${normalizeModelKey(model)}`;
}

function jsonbArrayParam(paramIndex) {
  return `COALESCE(
    (
      SELECT array_agg(elem)
      FROM jsonb_array_elements($${paramIndex}::jsonb) AS elem
    ),
    ARRAY[]::jsonb[]
  )::jsonb[]`;
}

function extFromContentType(contentType) {
  const base = String(contentType || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  return CONTENT_TYPE_EXT[base] || null;
}

function padIndex(n) {
  return String(n).padStart(2, "0");
}

function isMobeeMarcoR2Key(url, r2) {
  try {
    const parsed = new URL(url);
    if (parsed.host !== r2.publicHost) return false;
    return parsed.pathname.replace(/^\//, "").startsWith("products/marco/");
  } catch {
    return false;
  }
}

function extractMediaItem(item) {
  if (typeof item === "string" && item.trim()) {
    return { url: item.trim(), alt: "" };
  }
  if (item && typeof item === "object") {
    const url = item.url || item.src || item.value;
    if (typeof url === "string" && url.trim()) {
      return {
        url: url.trim(),
        alt: typeof item.alt === "string" ? item.alt : "",
      };
    }
  }
  return null;
}

function normalizeMediaList(media) {
  if (!Array.isArray(media)) return [];
  const out = [];
  for (const item of media) {
    const parsed = extractMediaItem(item);
    if (parsed) out.push(parsed);
  }
  return out;
}

async function loadMobeeCategoryById(mobee, categoryId) {
  if (!categoryId) return null;
  const { rows } = await mobee.query(
    `
    SELECT
      c.id,
      COALESCE(
        (
          SELECT ct.slug FROM category_translations ct
          WHERE ct."categoryId" = c.id
          ORDER BY CASE ct.locale WHEN 'en' THEN 0 WHEN 'ru' THEN 1 ELSE 2 END
          LIMIT 1
        ),
        ''
      ) AS slug,
      (
        SELECT ct.title FROM category_translations ct
        WHERE ct."categoryId" = c.id
        ORDER BY CASE ct.locale WHEN 'en' THEN 0 WHEN 'ru' THEN 1 ELSE 2 END
        LIMIT 1
      ) AS title,
      (
        SELECT ct."fullPath" FROM category_translations ct
        WHERE ct."categoryId" = c.id
        ORDER BY CASE ct.locale WHEN 'en' THEN 0 WHEN 'ru' THEN 1 ELSE 2 END
        LIMIT 1
      ) AS path
    FROM categories c
    WHERE c.id = $1 AND c."deletedAt" IS NULL
    LIMIT 1
    `,
    [categoryId]
  );
  return rows[0] || null;
}

function productInOfficialImageScope(product, category, args) {
  const brandKey = resolveBrandKey(product);
  if (!brandKey || !ALLOWED_BRAND_KEYS.has(brandKey)) return false;
  if (!category) return false;
  if (args.group && GROUPS[args.group]) {
    return categoryMatchesGroup(GROUPS[args.group], category);
  }
  // Any of the 4 matrix categories for this brand.
  for (const key of GROUP_KEYS) {
    const g = GROUPS[key];
    if (g.brandKey !== brandKey) continue;
    if (categoryMatchesGroup(g, category)) return true;
  }
  return false;
}

async function loadProducts(mobee, args) {
  const params = [SOURCE_NAME];
  const filters = [`p."deletedAt" IS NULL`];

  if (args.productId) {
    params.push(args.productId);
    filters.push(`p.id = $${params.length}`);
  }
  if (args.sourceProductId) {
    params.push(args.sourceProductId);
    filters.push(`(
      EXISTS (
        SELECT 1 FROM product_variants vx
        WHERE vx."productId" = p.id
          AND vx.source = $1
          AND (
            vx."sourcePid" = $${params.length}
            OR vx."sourcePid" = 'marco-product-' || $${params.length} || '-default'
          )
      )
    )`);
  }

  const brandFilter = args.brand || (args.group ? GROUP_TO_BRAND[args.group] : null);
  // Always constrain to matrix brands (unless targeting a single product id).
  if (brandFilter) {
    params.push(BRAND_ALIASES[brandFilter]);
    filters.push(`(
      lower(b.slug) = ANY($${params.length}::text[])
      OR EXISTS (
        SELECT 1 FROM brand_translations btx
        WHERE btx."brandId" = b.id
          AND lower(btx.name) = ANY($${params.length}::text[])
      )
    )`);
  } else if (!args.productId && !args.sourceProductId) {
    const allAliases = [...ALLOWED_BRAND_KEYS].flatMap(
      (k) => BRAND_ALIASES[k] || []
    );
    params.push(allAliases);
    filters.push(`(
      lower(b.slug) = ANY($${params.length}::text[])
      OR EXISTS (
        SELECT 1 FROM brand_translations btx
        WHERE btx."brandId" = b.id
          AND lower(btx.name) = ANY($${params.length}::text[])
      )
    )`);
  }

  // Category filter applied in JS; fetch a wider set then filter. Limit applies after.
  const { rows } = await mobee.query(
    `
    SELECT
      p.id,
      p.media,
      p."primaryCategoryId",
      p."categoryIds",
      b.slug AS brand_slug,
      (
        SELECT bt.name FROM brand_translations bt
        WHERE bt."brandId" = b.id
        ORDER BY CASE bt.locale WHEN 'en' THEN 0 WHEN 'ru' THEN 1 ELSE 2 END
        LIMIT 1
      ) AS brand_name,
      (
        SELECT pt.title FROM product_translations pt
        WHERE pt."productId" = p.id
        ORDER BY CASE pt.locale WHEN 'en' THEN 0 WHEN 'ru' THEN 1 ELSE 2 END
        LIMIT 1
      ) AS title,
      (
        SELECT array_agg(v.id ORDER BY v.position, v.id)
        FROM product_variants v
        WHERE v."productId" = p.id AND v.source = $1
      ) AS variant_ids,
      (
        SELECT array_agg(v."sourcePid" ORDER BY v.position, v.id)
        FROM product_variants v
        WHERE v."productId" = p.id AND v.source = $1
      ) AS source_pids,
      (
        SELECT v."imageUrl" FROM product_variants v
        WHERE v."productId" = p.id AND v.source = $1
        ORDER BY v.position, v.id LIMIT 1
      ) AS variant_image_url,
      (
        SELECT v.media FROM product_variants v
        WHERE v."productId" = p.id AND v.source = $1
        ORDER BY v.position, v.id LIMIT 1
      ) AS variant_media
    FROM products p
    JOIN brands b ON b.id = p."brandId"
    WHERE EXISTS (
      SELECT 1 FROM product_variants v
      WHERE v."productId" = p.id AND v.source = $1
    )
      AND ${filters.join(" AND ")}
    ORDER BY p.id
    `,
    params
  );

  const categoryCache = new Map();
  async function catFor(id) {
    if (!id) return null;
    if (categoryCache.has(id)) return categoryCache.get(id);
    const c = await loadMobeeCategoryById(mobee, id);
    categoryCache.set(id, c);
    return c;
  }

  const scoped = [];
  for (const row of rows) {
    // Single-id / source-pid lookups bypass category gate (explicit target).
    if (args.productId || args.sourceProductId) {
      scoped.push(row);
      continue;
    }
    const primary = await catFor(row.primaryCategoryId);
    let ok = productInOfficialImageScope(row, primary, args);
    if (!ok && Array.isArray(row.categoryIds)) {
      for (const cid of row.categoryIds) {
        const c = await catFor(cid);
        if (productInOfficialImageScope(row, c, args)) {
          ok = true;
          break;
        }
      }
    }
    if (ok) scoped.push(row);
  }

  if (args.limit != null) return scoped.slice(0, args.limit);
  return scoped;
}

function sha256Hex(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function validateImageCandidate(image, pageUrl, options = {}) {
  const allowLowResolution = Boolean(options.allowLowResolution);
  try {
    const got = await fetchImage(image.url, pageUrl);
    if (got.statusCode !== 200) {
      return {
        ...image,
        validated: false,
        validation: `GET_FAIL_${got.statusCode}`,
        manualStatus: "MANUAL_IMAGE_FETCH_FAILED",
        contentType: got.contentType,
        statusCode: got.statusCode,
        bytes: got.buffer?.length || 0,
      };
    }
    if (got.buffer.length <= MIN_IMAGE_BYTES) {
      const earlyDims = readImageDimensions(got.buffer);
      const resEarly = classifyResolution(earlyDims, { allowLowResolution });
      // Manual low-res QR may be slightly under 10KB; require ≥4KB + dims.
      const minBytes = allowLowResolution ? 4 * 1024 : MIN_IMAGE_BYTES;
      if (!(resEarly.ok && got.buffer.length > minBytes)) {
        return {
          ...image,
          validated: false,
          validation: `TOO_SMALL_${got.buffer?.length || 0}`,
          manualStatus: "MANUAL_IMAGE_TOO_SMALL",
          contentType: got.contentType,
          statusCode: got.statusCode,
          bytes: got.buffer?.length || 0,
          dimensions: earlyDims,
        };
      }
    }

    const mimeInfo = resolveMime(got.contentType, got.buffer);
    if (!mimeInfo.mime) {
      return {
        ...image,
        validated: false,
        validation: "NOT_IMAGE_CONTENT_TYPE",
        manualStatus: "MANUAL_IMAGE_INVALID",
        contentType: got.contentType,
        statusCode: got.statusCode,
        bytes: got.buffer.length,
      };
    }

    const dims = readImageDimensions(got.buffer);
    const res = classifyResolution(dims, { allowLowResolution });
    if (!res.ok) {
      return {
        ...image,
        validated: false,
        validation: res.status,
        manualStatus: "MANUAL_IMAGE_TOO_SMALL",
        contentType: mimeInfo.mime,
        statusCode: got.statusCode,
        bytes: got.buffer.length,
        dimensions: dims,
        warning: mimeInfo.warning,
      };
    }

    const evidence = {
      ...(image.evidence || {}),
      pageUrl,
      hostname: image.hostname || hostnameOf(image.url),
      dimensions: dims,
      contentHash: sha256Hex(got.buffer),
      extractionSource:
        image.extractionSource ||
        image.evidence?.extractionSource ||
        null,
    };

    let validation = "GET_OK";
    let manualStatus = "MANUAL_IMAGE_READY";
    if (res.status === "LOW_RES_OFFICIAL_LAST_RESORT") {
      validation = "LOW_RES_OFFICIAL_LAST_RESORT";
      manualStatus = "LOW_RES_OFFICIAL_LAST_RESORT";
    } else if (res.status === "LOW_RES_OFFICIAL_FALLBACK") {
      validation = "LOW_RES_OFFICIAL_FALLBACK";
      manualStatus = "MANUAL_IMAGE_READY";
    }

    return {
      ...image,
      validated: true,
      validation,
      manualStatus,
      contentType: mimeInfo.mime,
      statusCode: got.statusCode,
      bytes: got.buffer.length,
      dimensions: dims,
      sha256: evidence.contentHash,
      warning: mimeInfo.warning,
      evidence,
      buffer: got.buffer,
    };
  } catch (err) {
    return {
      ...image,
      validated: false,
      validation: `ERROR:${err.message}`,
      manualStatus: "MANUAL_IMAGE_FETCH_FAILED",
      statusCode: null,
      contentType: null,
    };
  }
}

function looksLikeNonProductManualUrl(url) {
  const lower = String(url || "").toLowerCase();
  return /\/logo|\/icon|favicon|placeholder|sprite|tracker|pixel\.|\/tr\?|facebook\.com\/tr/i.test(
    lower
  );
}

/**
 * Normalize approvedImageUrls from override — exact curated list only.
 * Accepts MANUAL_APPROVED_IMAGE and MANUAL_USER_APPROVED_SHARED_SERIES_IMAGE.
 */
function normalizeManualApprovedEntries(overrideEntry) {
  const raw = overrideEntry?.approvedImageUrls;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const url = typeof item.url === "string" ? item.url.trim() : "";
    if (!/^https?:\/\//i.test(url)) continue;
    if (!MANUAL_IMAGE_EVIDENCE_SET.has(item.evidence)) continue;
    out.push({
      url,
      evidence: item.evidence,
      allowLowResolution: Boolean(item.allowLowResolution),
      // Per-URL only: user confirmed shared-series photo despite filename model code.
      allowModelFilenameMismatch: Boolean(item.allowModelFilenameMismatch),
    });
  }
  return out;
}

/**
 * Process only manually approved image URLs — skip page gallery extraction.
 */
async function processManualApprovedImages(base, overrideEntry, modelForPage) {
  const pageUrl = overrideEntry.pageUrl;
  const entries = normalizeManualApprovedEntries(overrideEntry);
  base.officialPage = pageUrl;
  base.matchStatus = overrideEntry.matchType || "EXACT";
  base.matchType = overrideEntry.matchType || null;
  base.fromOverride = true;
  base.manualImageMode = true;
  base.foundImages = entries.map((e) => ({
    url: e.url,
    source: "manual",
    extractionSource: e.evidence,
    hostname: hostnameOf(e.url),
    allowLowResolution: e.allowLowResolution,
    allowModelFilenameMismatch: e.allowModelFilenameMismatch,
  }));
  base.totalFoundOnPage = entries.length;
  base.sourceImageDomains = [
    ...new Set(entries.map((e) => hostnameOf(e.url)).filter(Boolean)),
  ];

  const validated = [];
  const rejected = [];
  const seenSha = new Set();
  const manualRows = [];

  for (const entry of entries) {
    if (validated.length >= MAX_OFFICIAL_IMAGES) break;
    const host = hostnameOf(entry.url);
    if (isBlockedImageHost(host) || looksLikeNonProductManualUrl(entry.url)) {
      rejected.push({
        url: entry.url,
        reason: "MANUAL_IMAGE_INVALID",
        action: "REJECT_NON_PRODUCT_ASSET",
      });
      manualRows.push({
        model: modelForPage,
        url: entry.url,
        http: null,
        mime: null,
        dimensions: null,
        action: "MANUAL_IMAGE_INVALID",
      });
      continue;
    }

    const candidate = {
      url: entry.url,
      hostname: host,
      source: "manual",
      extractionSource: entry.evidence,
      evidence: {
        extractionSource: entry.evidence,
        jsonPath: "override.approvedImageUrls",
        pageUrl,
        model: modelForPage,
        allowModelFilenameMismatch: entry.allowModelFilenameMismatch,
      },
    };
    const result = await validateImageCandidate(candidate, pageUrl, {
      allowLowResolution: entry.allowLowResolution,
    });
    manualRows.push({
      model: modelForPage,
      url: entry.url,
      http: result.statusCode,
      mime: result.contentType || null,
      dimensions: result.dimensions || null,
      action: result.manualStatus || result.validation,
      bytes: result.bytes || 0,
      warning: result.warning || null,
    });
    if (!result.validated) {
      rejected.push({
        url: entry.url,
        reason: result.manualStatus || result.validation,
        action: "REJECT_MANUAL_VALIDATION",
      });
      continue;
    }
    if (result.sha256 && seenSha.has(result.sha256)) {
      rejected.push({
        url: entry.url,
        reason: "DUPLICATE_SHA256",
        action: "REJECT_DUPLICATE",
      });
      continue;
    }
    if (result.sha256) seenSha.add(result.sha256);
    const rest = { ...result };
    delete rest.buffer;
    validated.push(rest);
  }

  base.rejectedImages = rejected;
  base.manualImageRows = manualRows;
  base.validatedImages = validated.map((img) => ({
    url: img.url,
    source: img.source,
    extractionSource: img.extractionSource || img.evidence?.extractionSource,
    hostname: img.hostname,
    contentType: img.contentType,
    validation: img.validation,
    statusCode: img.statusCode,
    bytes: img.bytes,
    dimensions: img.dimensions,
    sha256: img.sha256,
    warning: img.warning || null,
    evidence: img.evidence || null,
  }));
  base.validatedCount = validated.length;
  base.plannedR2Keys = plannedR2Keys(base.brand, modelForPage, validated);
  base.extractionSources = [
    ...new Set(
      validated
        .map((v) => v.extractionSource || v.evidence?.extractionSource)
        .filter(Boolean)
    ),
  ];
  base.lowResLastResort = validated.some(
    (v) => v.validation === "LOW_RES_OFFICIAL_LAST_RESORT"
  );
  base.lowResFallback = validated.some(
    (v) =>
      v.validation === "LOW_RES_OFFICIAL_FALLBACK" ||
      v.validation === "LOW_RES_OFFICIAL_LAST_RESORT"
  );

  if (validated.length === 0) {
    const firstFail =
      rejected[0]?.reason ||
      manualRows[0]?.action ||
      "MANUAL_IMAGE_INVALID";
    base.approvedStatus = firstFail.startsWith("MANUAL_")
      ? firstFail
      : "MANUAL_IMAGE_INVALID";
    base.status = base.approvedStatus;
    return { ...base, ...decideAction(base) };
  }

  if (base.lowResLastResort) {
    base.approvedStatus = "LOW_RES_OFFICIAL_LAST_RESORT";
    base.status = "LOW_RES_OFFICIAL_LAST_RESORT";
  } else {
    base.approvedStatus = "MANUAL_IMAGE_READY";
    base.status = "MANUAL_IMAGE_READY";
  }
  return { ...base, ...decideAction(base) };
}

function plannedR2Keys(brand, model, validatedImages) {
  const modelPath = normalizeModelKey(model);
  return validatedImages.map((img, index) => {
    const ext =
      extFromContentType(img.contentType) ||
      (/\.png/i.test(img.url) ? "png" : /\.webp/i.test(img.url) ? "webp" : "jpg");
    const key = `products/official/${brand}/${modelPath}/image-${padIndex(index + 1)}.${ext}`;
    return { key, sourceUrl: img.url, ext, contentType: img.contentType };
  });
}

function loadOverrides() {
  try {
    if (!fs.existsSync(OVERRIDES_PATH)) return {};
    const raw = JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf8"));
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

function aggregateCdnCandidates(results) {
  const map = new Map();
  for (const row of results) {
    for (const c of row.cdnCandidates || []) {
      const key = [
        c.hostname,
        c.brand || row.brand,
        c.productPage || row.officialPage || "",
        c.extractionSource || "",
      ].join("::");
      const existing = map.get(key) || {
        hostname: c.hostname,
        brand: c.brand || row.brand,
        approvedPage: c.productPage || row.officialPage || null,
        extractionSource: c.extractionSource || null,
        hits: 0,
        sampleUrl: c.sampleImageUrl || c.imageUrl || null,
        model: c.model || row.extractedModel || null,
        httpStatus: c.httpStatus || null,
        contentType: c.contentType || null,
        productIds: [],
      };
      existing.hits += 1;
      if (!existing.sampleUrl) {
        existing.sampleUrl = c.sampleImageUrl || c.imageUrl || null;
      }
      if (!existing.httpStatus && c.httpStatus) existing.httpStatus = c.httpStatus;
      if (!existing.contentType && c.contentType) existing.contentType = c.contentType;
      if (row.productId && existing.productIds.length < 8) {
        existing.productIds.push(row.productId);
      }
      map.set(key, existing);
    }
  }
  return [...map.values()].sort((a, b) => b.hits - a.hits);
}

function mediaAllOfficial(mediaList, r2 = null) {
  const list = normalizeMediaList(mediaList);
  if (!list.length) return false;
  return list.every((m) => {
    const url = String(m.url || "");
    if (!url.includes("/products/official/")) return false;
    if (r2?.publicHost) {
      try {
        return new URL(url).host === r2.publicHost;
      } catch {
        return true;
      }
    }
    return true;
  });
}

async function verifyOfficialMediaAlive(mediaList) {
  const list = normalizeMediaList(mediaList);
  if (!list.length) return { ok: false, checks: [] };
  const checks = [];
  for (const item of list.slice(0, 12)) {
    const head = await headRequest(item.url);
    const ok = head.ok || head.statusCode === 200;
    checks.push({ url: item.url, ok, statusCode: head.statusCode });
    if (!ok) {
      try {
        const got = await fetchImage(item.url);
        const getOk = got.statusCode === 200;
        checks[checks.length - 1] = {
          url: item.url,
          ok: getOk,
          statusCode: got.statusCode,
        };
        if (!getOk) return { ok: false, checks };
      } catch {
        return { ok: false, checks };
      }
    }
  }
  return { ok: checks.every((c) => c.ok), checks };
}

function decideAction(row) {
  if (!row.hasApprovedOverride) {
    return {
      action: "MANUAL_REVIEW",
      status: "NO_APPROVED_PAGE",
      approvedStatus: null,
      manualReviewReason: "NO_APPROVED_PAGE",
    };
  }
  if (row.status === "ALREADY_OFFICIAL" || row.approvedStatus === "ALREADY_OFFICIAL") {
    return {
      action: "SKIP_ALREADY_OFFICIAL",
      status: "ALREADY_OFFICIAL",
      approvedStatus: "ALREADY_OFFICIAL",
      manualReviewReason: null,
    };
  }
  if (
    row.approvedStatus === "MANUAL_IMAGE_READY" ||
    row.status === "MANUAL_IMAGE_READY"
  ) {
    return {
      action: "READY_TO_REPLACE",
      status: "MANUAL_IMAGE_READY",
      approvedStatus: "MANUAL_IMAGE_READY",
      manualReviewReason: null,
    };
  }
  if (
    row.approvedStatus === "LOW_RES_OFFICIAL_LAST_RESORT" ||
    row.status === "LOW_RES_OFFICIAL_LAST_RESORT"
  ) {
    return {
      action: "READY_TO_REPLACE",
      status: "LOW_RES_OFFICIAL_LAST_RESORT",
      approvedStatus: "LOW_RES_OFFICIAL_LAST_RESORT",
      manualReviewReason: null,
    };
  }
  if (
    row.approvedStatus === "MANUAL_IMAGE_FETCH_FAILED" ||
    row.approvedStatus === "MANUAL_IMAGE_TOO_SMALL" ||
    row.approvedStatus === "MANUAL_IMAGE_INVALID"
  ) {
    return {
      action: "MANUAL_REVIEW",
      status: row.approvedStatus,
      approvedStatus: row.approvedStatus,
      manualReviewReason: row.approvedStatus,
    };
  }
  if (
    row.matchStatus === "MODEL_MISMATCH" ||
    row.matchStatus === "OVERRIDE_MODEL_MISMATCH"
  ) {
    return {
      action: "MANUAL_REVIEW",
      status: "MODEL_MISMATCH",
      approvedStatus: "MODEL_MISMATCH",
      manualReviewReason: "MODEL_MISMATCH",
    };
  }
  if (
    row.approvedStatus === "PAGE_FETCH_FAILED" ||
    /^PAGE_HTTP_/i.test(String(row.manualReviewReason || "")) ||
    /^OVERRIDE_HTTP_/i.test(String(row.resolveReason || "")) ||
    /^OVERRIDE_FETCH_FAILED/i.test(String(row.resolveReason || ""))
  ) {
    return {
      action: "MANUAL_REVIEW",
      status: "PAGE_FETCH_FAILED",
      approvedStatus: "PAGE_FETCH_FAILED",
      manualReviewReason: row.manualReviewReason || row.resolveReason || "PAGE_FETCH_FAILED",
    };
  }
  if (row.matchStatus === "NOT_FOUND" || row.matchStatus === "AMBIGUOUS") {
    return {
      action: "MANUAL_REVIEW",
      status: "PAGE_FETCH_FAILED",
      approvedStatus: "PAGE_FETCH_FAILED",
      manualReviewReason: row.resolveReason || row.matchStatus || "PAGE_FETCH_FAILED",
    };
  }
  if (!row.officialPage) {
    return {
      action: "MANUAL_REVIEW",
      status: "PAGE_FETCH_FAILED",
      approvedStatus: "PAGE_FETCH_FAILED",
      manualReviewReason: row.resolveReason || "PAGE_NOT_FOUND",
    };
  }
  if (row.approvedStatus === "EXTRACTION_FAILED") {
    return {
      action: "MANUAL_REVIEW",
      status: "EXTRACTION_FAILED",
      approvedStatus: "EXTRACTION_FAILED",
      manualReviewReason: row.manualReviewReason || "EXTRACTION_FAILED",
    };
  }
  if (!row.validatedCount) {
    return {
      action: "MANUAL_REVIEW",
      status: "NO_VALID_IMAGES",
      approvedStatus: "NO_VALID_IMAGES",
      manualReviewReason: "NO_VALID_IMAGES",
    };
  }
  return {
    action: "READY_TO_REPLACE",
    status: "READY",
    approvedStatus: "READY",
    manualReviewReason: null,
  };
}

function countApprovedOverrideEntries(overrides) {
  let n = 0;
  for (const brandMap of Object.values(overrides || {})) {
    if (!brandMap || typeof brandMap !== "object") continue;
    for (const entry of Object.values(brandMap)) {
      if (entry?.approved && entry?.pageUrl) n += 1;
    }
  }
  return n;
}

function approvedStatusBucket(row) {
  if (!row.hasApprovedOverride) return null;
  if (
    row.approvedStatus === "MANUAL_IMAGE_READY" ||
    row.status === "MANUAL_IMAGE_READY" ||
    row.approvedStatus === "LOW_RES_OFFICIAL_LAST_RESORT" ||
    row.status === "LOW_RES_OFFICIAL_LAST_RESORT"
  ) {
    return "READY";
  }
  if (
    row.approvedStatus === "MANUAL_IMAGE_FETCH_FAILED" ||
    row.approvedStatus === "MANUAL_IMAGE_TOO_SMALL" ||
    row.approvedStatus === "MANUAL_IMAGE_INVALID"
  ) {
    return "NO_VALID_IMAGES";
  }
  if (APPROVED_PAGE_STATUSES.includes(row.approvedStatus)) return row.approvedStatus;
  if (APPROVED_PAGE_STATUSES.includes(row.status)) return row.status;
  return "OTHER";
}

async function enrichCdnCandidates(candidates, limit = 12) {
  const unique = [];
  const seen = new Set();
  for (const c of candidates) {
    const key = `${c.hostname}::${c.sampleImageUrl || c.imageUrl || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(c);
    if (unique.length >= limit) break;
  }
  for (const c of unique) {
    const url = c.sampleImageUrl || c.imageUrl;
    if (!url) continue;
    const head = await headRequest(url);
    c.httpStatus = head.statusCode;
    c.contentType = head.contentType || null;
  }
  return candidates.map((c) => {
    const hit = unique.find(
      (u) =>
        u.hostname === c.hostname &&
        (u.sampleImageUrl || u.imageUrl) === (c.sampleImageUrl || c.imageUrl)
    );
    if (!hit) return c;
    return {
      ...c,
      httpStatus: hit.httpStatus ?? c.httpStatus,
      contentType: hit.contentType ?? c.contentType,
    };
  });
}

async function processProduct(product, args, cache, r2, overrides) {
  const brand = resolveBrandKey(product);
  const extractedModel = extractModelFromTitle(product.title || "");
  const overrideEntry = brand
    ? findOverrideEntryForTitle(
        overrides,
        brand,
        product.title || "",
        extractedModel
      )
    : null;
  const modelForPage =
    overrideEntry?.normalizedModel ||
    overrideEntry?.marcoModel ||
    extractedModel;
  const currentMedia = normalizeMediaList(product.media);
  const base = {
    productId: product.id,
    title: product.title,
    brand,
    brandName: product.brand_name,
    extractedModel,
    normalizedModel: modelForPage ? normalizeModelKey(modelForPage) : null,
    overrideNormalizedModel: overrideEntry?.normalizedModel || null,
    matchType: overrideEntry?.matchType || null,
    hasApprovedOverride: Boolean(
      overrideEntry?.approved && overrideEntry?.pageUrl
    ),
    officialPage: null,
    matchStatus: null,
    sourceDomain: null,
    sourceImageDomains: [],
    foundImages: [],
    validatedImages: [],
    validatedCount: 0,
    totalFoundOnPage: 0,
    plannedR2Keys: [],
    cdnCandidates: [],
    rejectedImages: [],
    fromCache: false,
    fromOverride: false,
    currentMediaCount: currentMedia.length,
  };

  if (!brand) {
    return {
      ...base,
      action: "SKIP",
      status: "UNSUPPORTED_BRAND",
      manualReviewReason: "UNSUPPORTED_BRAND",
    };
  }
  if (!extractedModel) {
    base.matchStatus = "NO_APPROVED_PAGE";
    return {
      ...base,
      ...decideAction(base),
    };
  }

  if (mediaAllOfficial(currentMedia, r2)) {
    const alive = await verifyOfficialMediaAlive(currentMedia);
    if (alive.ok) {
      return {
        ...base,
        officialPage: overrideEntry?.pageUrl || null,
        matchStatus: overrideEntry?.matchType || "EXACT",
        matchType: overrideEntry?.matchType || null,
        fromOverride: Boolean(overrideEntry),
        validatedCount: currentMedia.length,
        validatedImages: currentMedia.map((m) => ({ url: m.url })),
        currentOfficialUrls: currentMedia.map((m) => m.url),
        approvedStatus: "ALREADY_OFFICIAL",
        status: "ALREADY_OFFICIAL",
        action: "SKIP_ALREADY_OFFICIAL",
        r2Verify: alive.checks,
      };
    }
  }

  // Manually curated image URLs take priority — skip page gallery extraction.
  if (
    base.hasApprovedOverride &&
    normalizeManualApprovedEntries(overrideEntry).length > 0
  ) {
    return processManualApprovedImages(base, overrideEntry, modelForPage);
  }

  const ck = cacheKey(brand, extractedModel);
  const cached = cache[ck] || null;

  const resolved = await resolveOfficialProductPage(
    brand,
    modelForPage || extractedModel,
    cached,
    overrides,
    overrideEntry
  );
  base.officialPage = resolved.officialPage;
  base.matchStatus = resolved.matchStatus;
  base.matchType = resolved.matchType || overrideEntry?.matchType || null;
  base.overrideNormalizedModel =
    resolved.overrideNormalizedModel || overrideEntry?.normalizedModel || null;
  base.fromCache = Boolean(resolved.fromCache);
  base.fromOverride = Boolean(resolved.fromOverride);
  base.candidates = resolved.candidates || [];
  base.attemptedOfficialUrls = (resolved.candidates || [])
    .map((c) => c.url)
    .filter(Boolean)
    .slice(0, 20);
  base.resolveReason = resolved.reason || null;

  if (resolved.officialPage) {
    try {
      base.sourceDomain = hostnameOf(resolved.officialPage);
    } catch {
      base.sourceDomain = null;
    }
  }

  if (
    resolved.matchStatus === "NO_APPROVED_PAGE" ||
    resolved.matchStatus === "MODEL_MISMATCH" ||
    resolved.matchStatus === "OVERRIDE_MODEL_MISMATCH" ||
    resolved.matchStatus === "NOT_FOUND" ||
    resolved.matchStatus === "AMBIGUOUS" ||
    !resolved.officialPage
  ) {
    const decision = decideAction(base);
    return { ...base, ...decision };
  }

  let html = resolved.html;
  if (!html) {
    const page = await fetchHtml(resolved.officialPage);
    if (page.statusCode !== 200) {
      return {
        ...base,
        ...decideAction({
          ...base,
          approvedStatus: "PAGE_FETCH_FAILED",
          manualReviewReason: `PAGE_HTTP_${page.statusCode}`,
          resolveReason: `PAGE_HTTP_${page.statusCode}`,
        }),
      };
    }
    html = page.html;
  }

  let extracted = extractOfficialImages(html, brand, resolved.officialPage, {
    model: modelForPage,
    matchStatus: resolved.pageModelMatch || resolved.matchStatus,
    matchType: base.matchType,
  });

  if (
    extracted.images.length === 0 &&
    brand === "hisense" &&
    /qrcode\.hisense\.com/i.test(resolved.officialPage) &&
    base.matchType === "SUPPORT_PAGE"
  ) {
    const headless = await withHeadlessLock(() =>
      extractWithHeadlessBrowser(resolved.officialPage, modelForPage)
    );
    base.headlessUsed = Boolean(headless.usedBrowser);
    base.headlessReason = headless.reason || null;
    if (headless.html) html = headless.html;
    extracted = extractOfficialImages(html, brand, resolved.officialPage, {
      model: modelForPage,
      matchStatus: resolved.pageModelMatch || resolved.matchStatus,
      matchType: base.matchType,
      extraCandidates: headless.candidates || [],
    });
    if (extracted.images.length === 0 && headless.usedBrowser) {
      base.approvedStatus = "EXTRACTION_FAILED";
      base.manualReviewReason = headless.reason || "EXTRACTION_FAILED";
    }
  }

  base.totalFoundOnPage = extracted.totalFound;
  base.rejectedImages = extracted.rejected || [];
  base.cdnCandidates = await enrichCdnCandidates(extracted.cdnCandidates || [], 8);
  base.foundImages = extracted.images.map((img) => ({
    url: img.url,
    source: img.source,
    extractionSource: img.extractionSource,
    hostname: img.hostname,
    score: img.score,
    evidence: img.evidence || null,
  }));
  base.sourceImageDomains = [
    ...new Set(extracted.images.map((img) => img.hostname).filter(Boolean)),
  ];

  if (extracted.images.length === 0 && !base.approvedStatus) {
    if ((extracted.rejected || []).length > 0) {
      base.approvedStatus = "NO_VALID_IMAGES";
    } else {
      base.approvedStatus = "EXTRACTION_FAILED";
      base.manualReviewReason = base.manualReviewReason || "EXTRACTION_FAILED";
    }
  }

  const toValidate = extracted.images.slice(0, MAX_OFFICIAL_IMAGES * 2);
  let validated = [];
  const seenSha = new Set();
  for (const img of toValidate) {
    if (validated.length >= MAX_OFFICIAL_IMAGES) break;
    const result = await validateImageCandidate(img, resolved.officialPage);
    if (!result.validated) {
      base.rejectedImages.push({
        url: img.url,
        reason: result.validation,
        action: "REJECT_VALIDATION",
      });
      continue;
    }
    if (result.sha256 && seenSha.has(result.sha256)) {
      base.rejectedImages.push({
        url: img.url,
        reason: "DUPLICATE_SHA256",
        action: "REJECT_DUPLICATE",
      });
      continue;
    }
    if (result.sha256) seenSha.add(result.sha256);
    const rest = { ...result };
    delete rest.buffer;
    validated.push(rest);
  }

  validated = sortValidatedForPrimary(validated).slice(0, MAX_OFFICIAL_IMAGES);
  base.validatedImages = validated.map((img) => ({
    url: img.url,
    source: img.source,
    extractionSource: img.extractionSource,
    hostname: img.hostname,
    contentType: img.contentType,
    validation: img.validation,
    statusCode: img.statusCode,
    bytes: img.bytes,
    dimensions: img.dimensions,
    sha256: img.sha256,
    warning: img.warning || null,
    evidence: img.evidence || null,
  }));
  base.validatedCount = validated.length;
  base.lowResFallback = validated.some(
    (v) => v.validation === "LOW_RES_OFFICIAL_FALLBACK"
  );
  base.plannedR2Keys = plannedR2Keys(brand, modelForPage, validated);
  base.extractionSources = [
    ...new Set(
      validated
        .map((v) => v.extractionSource || v.evidence?.extractionSource)
        .filter(Boolean)
    ),
  ];

  cache[ck] = {
    brand,
    model: extractedModel,
    officialPage: resolved.officialPage,
    matchStatus: resolved.matchStatus,
    matchType: base.matchType,
    imageUrls: validated.map((v) => v.url),
    updatedAt: new Date().toISOString(),
  };

  const decision = decideAction(base);
  return { ...base, ...decision };
}

async function uploadOfficialImages(r2, planned) {
  const uploaded = [];
  for (const item of planned) {
    const got = await fetchImage(item.sourceUrl);
    if (got.statusCode !== 200) {
      throw new Error(`Upload fetch failed for ${item.sourceUrl}: HTTP ${got.statusCode}`);
    }
    const mimeInfo = resolveMime(got.contentType, got.buffer);
    if (!mimeInfo.mime) {
      throw new Error(`Upload not image for ${item.sourceUrl}: ${got.contentType}`);
    }
    const ext =
      mimeInfo.ext ||
      extFromContentType(mimeInfo.mime) ||
      item.ext ||
      "jpg";
    const key = item.key.replace(/\.[a-z0-9]+$/i, `.${ext}`);
    await r2.client.send(
      new PutObjectCommand({
        Bucket: r2.bucket,
        Key: key,
        Body: got.buffer,
        ContentType: mimeInfo.mime,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    const publicUrl = `${r2.publicUrlBase}/${key}`;
    uploaded.push({
      key,
      publicUrl,
      contentType: mimeInfo.mime,
      warning: mimeInfo.warning,
    });
  }
  return uploaded;
}

async function verifyPublicUrls(urls) {
  const results = [];
  for (const url of urls) {
    const head = await headRequest(url);
    results.push({
      url,
      ok: head.ok || head.statusCode === 200,
      statusCode: head.statusCode,
    });
  }
  return results;
}

async function applyProductReplace(mobee, r2, product, plan, args) {
  if (
    plan.action === "SKIP_ALREADY_OFFICIAL" ||
    plan.status === "ALREADY_OFFICIAL" ||
    plan.approvedStatus === "ALREADY_OFFICIAL"
  ) {
    return {
      ok: true,
      skipped: true,
      reused: true,
      reason: "ALREADY_OFFICIAL",
      publicUrls: plan.currentOfficialUrls || normalizeMediaList(product.media).map((m) => m.url),
      uploaded: 0,
    };
  }

  if (plan.action !== "READY_TO_REPLACE" || plan.validatedCount < 1) {
    return { ok: false, skipped: true, reason: plan.status };
  }

  const uploaded = await uploadOfficialImages(r2, plan.plannedR2Keys);
  const publicUrls = uploaded.map((u) => u.publicUrl);
  const verify = await verifyPublicUrls(publicUrls);
  const failedVerify = verify.filter((v) => !v.ok);
  if (failedVerify.length) {
    for (const u of uploaded) {
      try {
        await r2.client.send(
          new DeleteObjectCommand({ Bucket: r2.bucket, Key: u.key })
        );
      } catch {
        /* ignore */
      }
    }
    return {
      ok: false,
      reason: "NEW_R2_HTTP_VERIFY_FAILED",
      failedVerify,
    };
  }

  const alt = product.title || plan.extractedModel || "";
  const newMedia = uploaded.map((u) => ({ url: u.publicUrl, alt }));
  const oldMedia = normalizeMediaList(product.media);
  const oldMarcoKeys = oldMedia
    .map((m) => m.url)
    .filter((url) => isMobeeMarcoR2Key(url, r2))
    .map((url) => new URL(url).pathname.replace(/^\//, ""));

  const variantsBefore = await mobee.query(
    `
    SELECT id, sku, price, stock, "imageUrl", media, source
    FROM product_variants
    WHERE "productId" = $1 AND source = $2
    `,
    [product.id, SOURCE_NAME]
  );

  const productBefore = await mobee.query(
    `
    SELECT id, media, "brandId", "discountPercent", published
    FROM products
    WHERE id = $1
    `,
    [product.id]
  );

  const translationsBefore = await mobee.query(
    `
    SELECT id, locale, title, subtitle, "descriptionHtml", slug
    FROM product_translations
    WHERE "productId" = $1
    ORDER BY locale
    `,
    [product.id]
  ).catch(() => ({ rows: [] }));

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const backupPath = path.join(
    BACKUP_DIR,
    `backup-${product.id}-${Date.now()}.json`
  );
  const backupPayload = {
    productId: product.id,
    title: product.title,
    brand: plan.brand,
    extractedModel: plan.extractedModel,
    overrideNormalizedModel: plan.overrideNormalizedModel,
    matchType: plan.matchType,
    officialPage: plan.officialPage,
    backedUpAt: new Date().toISOString(),
    product: productBefore.rows[0] || null,
    variants: variantsBefore.rows,
    translations: translationsBefore.rows,
    oldMedia,
    plannedR2Keys: plan.plannedR2Keys,
    newMedia,
  };
  fs.writeFileSync(backupPath, JSON.stringify(backupPayload, null, 2));

  await mobee.query("BEGIN");
  try {
    await mobee.query(
      `
      UPDATE products
      SET media = ${jsonbArrayParam(2)}, "updatedAt" = NOW()
      WHERE id = $1
      `,
      [product.id, JSON.stringify(newMedia)]
    );

    for (const variant of variantsBefore.rows) {
      await mobee.query(
        `
        UPDATE product_variants
        SET
          "imageUrl" = $2,
          media = ${jsonbArrayParam(3)},
          "updatedAt" = NOW()
        WHERE id = $1
        `,
        [variant.id, newMedia[0].url, JSON.stringify(newMedia)]
      );
    }

    await mobee.query("COMMIT");
  } catch (err) {
    await mobee.query("ROLLBACK");
    throw err;
  }

  let deletedKeys = [];
  if (args.deleteOldImages && oldMarcoKeys.length) {
    const stillUsed = [];
    for (const key of oldMarcoKeys) {
      const url = `${r2.publicUrlBase}/${key}`;
      const refs = await mobee.query(
        `
        SELECT 1 AS hit FROM products
        WHERE media::text LIKE $1
        UNION ALL
        SELECT 1 FROM product_variants
        WHERE "imageUrl" = $2 OR media::text LIKE $1
        LIMIT 1
        `,
        [`%${key}%`, url]
      );
      if (refs.rows.length) stillUsed.push(key);
      else {
        try {
          await r2.client.send(
            new DeleteObjectCommand({ Bucket: r2.bucket, Key: key })
          );
          deletedKeys.push(key);
        } catch (err) {
          stillUsed.push(`${key}:${err.message}`);
        }
      }
    }
    return {
      ok: true,
      status: plan.status,
      uploaded: uploaded.length,
      deletedKeys,
      stillUsed,
      backupPath,
      publicUrls,
    };
  }

  return {
    ok: true,
    status: plan.status,
    uploaded: uploaded.length,
    deletedKeys,
    backupPath,
    publicUrls,
  };
}

function summarize(results) {
  const brands = {};
  for (const key of Object.keys(OFFICIAL_SOURCES)) {
    brands[key] = {
      brand: key,
      products: 0,
      approved: 0,
      ready: 0,
      alreadyOfficial: 0,
      noValidImages: 0,
      fetchFailed: 0,
      modelMismatch: 0,
      extractionFailed: 0,
      other: 0,
      noApprovedPage: 0,
    };
  }
  for (const row of results) {
    const b = row.brand || "unknown";
    if (!brands[b]) {
      brands[b] = {
        brand: b,
        products: 0,
        approved: 0,
        ready: 0,
        alreadyOfficial: 0,
        noValidImages: 0,
        fetchFailed: 0,
        modelMismatch: 0,
        extractionFailed: 0,
        other: 0,
        noApprovedPage: 0,
      };
    }
    const s = brands[b];
    s.products += 1;
    if (!row.hasApprovedOverride) {
      s.noApprovedPage += 1;
      continue;
    }
    s.approved += 1;
    const bucket = approvedStatusBucket(row);
    if (bucket === "READY") s.ready += 1;
    else if (bucket === "ALREADY_OFFICIAL") s.alreadyOfficial += 1;
    else if (bucket === "NO_VALID_IMAGES") s.noValidImages += 1;
    else if (bucket === "PAGE_FETCH_FAILED") s.fetchFailed += 1;
    else if (bucket === "MODEL_MISMATCH") s.modelMismatch += 1;
    else if (bucket === "EXTRACTION_FAILED") s.extractionFailed += 1;
    else s.other += 1;
  }
  return Object.values(brands).filter((b) => b.products > 0);
}

function printSummaryTable(summary) {
  console.log(
    "\n| Brand | Approved | Ready | Already official | No valid images | Fetch failed | Other |"
  );
  console.log("|---|---:|---:|---:|---:|---:|---:|");
  for (const row of summary) {
    const other =
      row.other + row.modelMismatch + row.extractionFailed;
    console.log(
      `| ${row.brand} | ${row.approved} | ${row.ready} | ${row.alreadyOfficial} | ${row.noValidImages} | ${row.fetchFailed} | ${other} |`
    );
  }
}

function printFocusReports(results, previousNotReady = []) {
  console.log("\n## Approved status breakdown");
  const approved = results.filter((r) => r.hasApprovedOverride);
  for (const row of approved) {
    console.log(
      `- [${row.brand}] ${row.title} | status=${approvedStatusBucket(row)} | images=${row.validatedCount || 0} | page=${row.officialPage || "-"} | sources=${(row.extractionSources || []).join("|") || "-"}`
    );
  }

  console.log("\n## Previously not READY (delta)");
  for (const prev of previousNotReady) {
    const now = results.find((r) => r.productId === prev.productId);
    if (!now) continue;
    console.log(
      JSON.stringify(
        {
          title: now.title,
          model: now.extractedModel || now.overrideNormalizedModel,
          pageUrl: now.officialPage || prev.pageUrl || null,
          previousStatus: prev.status || prev.manualReviewReason,
          newStatus: approvedStatusBucket(now) || now.status,
          foundImages: now.totalFoundOnPage || 0,
          acceptedImages: now.validatedCount || 0,
          extractionSource: (now.extractionSources || []).join("|") || null,
          rejectedReason:
            (now.rejectedImages || []).slice(0, 3).map((x) => x.reason).join("|") ||
            now.manualReviewReason ||
            null,
          imageHostname: (now.sourceImageDomains || []).join("|") || null,
        },
        null,
        2
      )
    );
  }

  console.log("\n## CDN_CANDIDATE hosts");
  const cdn = aggregateCdnCandidates(results);
  for (const c of cdn.slice(0, 40)) {
    console.log(
      `- ${c.hostname} | brand=${c.brand} | hits=${c.hits} | source=${c.extractionSource || "-"} | page=${c.approvedPage || "-"} | sample=${c.sampleUrl || "-"}`
    );
  }
}

function pickSmokeTests(results) {
  const pick = (pred) => results.find(pred) || null;
  return {
    samsung: pick((r) => r.brand === "samsung" && (r.action === "READY_TO_REPLACE" || r.status === "ALREADY_OFFICIAL")),
    bosch: pick((r) => r.brand === "bosch" && (r.action === "READY_TO_REPLACE" || r.status === "ALREADY_OFFICIAL")),
    lg: pick((r) => r.brand === "lg" && (r.action === "READY_TO_REPLACE" || r.status === "ALREADY_OFFICIAL")),
    hisense: pick((r) => r.brand === "hisense" && (r.action === "READY_TO_REPLACE" || r.status === "ALREADY_OFFICIAL")),
    midea: pick((r) => r.brand === "midea" && (r.action === "READY_TO_REPLACE" || r.status === "ALREADY_OFFICIAL")),
  };
}

function printManualImageTable(results) {
  const rows = results.filter((r) => r.manualImageMode);
  if (!rows.length) return;
  console.log("\n## Manual approved images");
  console.log(
    "| Model | Manual URL | HTTP | MIME/magic bytes | Dimensions | Action |"
  );
  console.log("|---|---|---:|---|---:|---|");
  for (const r of rows) {
    const manualRows =
      Array.isArray(r.manualImageRows) && r.manualImageRows.length
        ? r.manualImageRows
        : [
            {
              model: r.normalizedModel || r.extractedModel,
              url: (r.foundImages || [])[0]?.url || "-",
              http: null,
              mime: null,
              dimensions: null,
              action: r.status,
            },
          ];
    for (const m of manualRows) {
      const dims = m.dimensions
        ? `${m.dimensions.width}x${m.dimensions.height}`
        : "-";
      const urlShort =
        String(m.url || "-").length > 90
          ? `${String(m.url).slice(0, 87)}...`
          : m.url || "-";
      console.log(
        `| ${m.model || r.normalizedModel || "-"} | ${urlShort} | ${m.http ?? "-"} | ${m.mime || "-"} | ${dims} | ${m.action || r.status} |`
      );
    }
  }
}

function productMatchesModels(product, models, overrides) {
  if (!models || !models.length) return true;
  const brand = resolveBrandKey(product);
  const extracted = extractModelFromTitle(product.title || "");
  if (!brand) return false;
  const overrideEntry = findOverrideEntryForTitle(
    overrides,
    brand,
    product.title || "",
    extracted
  );
  const candidates = [
    compactModel(extracted),
    compactModel(overrideEntry?.normalizedModel || ""),
    compactModel(overrideEntry?.marcoModel || ""),
    compactModel(product.title || ""),
  ].filter(Boolean);
  return models.some((m) => candidates.some((c) => c === m || c.includes(m) || m.includes(c)));
}

function printSmokeTests(smoke) {
  console.log("\n## Smoke-test candidates (no apply)");
  for (const [label, row] of Object.entries(smoke)) {
    if (!row) {
      console.log(`- ${label}: none`);
      continue;
    }
    console.log(
      JSON.stringify(
        {
          label,
          productId: row.productId,
          title: row.title,
          officialPage: row.officialPage,
          matchStatus: row.matchStatus,
          exactModelEvidence: row.extractedModel,
          officialSourceUrls: (row.validatedImages || []).map((i) => i.url),
          plannedR2Keys: (row.plannedR2Keys || []).map((k) => k.key),
          oldMediaCount: row.currentMediaCount,
          newOfficialMediaCount: row.validatedCount,
        },
        null,
        2
      )
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const env = loadEnv(path.join(process.cwd(), ".env"));
  if (!env.DIRECT_URL) throw new Error("Missing DIRECT_URL");

  const mobee = createDbClient(env.DIRECT_URL);
  await mobee.connect();

  let r2 = null;
  try {
    r2 = createR2Client(env);
  } catch (err) {
    if (args.apply) throw err;
    console.warn(`[warn] R2 not configured (${err.message}); dry-run continues without R2.`);
  }

  const overrides = loadOverrides();
  const overrideFileCount = countApprovedOverrideEntries(overrides);
  let products = await loadProducts(mobee, args);
  if (args.productIds?.length) {
    const idSet = new Set(args.productIds);
    products = products.filter((p) => idSet.has(p.id));
  }
  if (args.models?.length) {
    products = products.filter((p) =>
      productMatchesModels(p, args.models, overrides)
    );
  }
  console.log(`Loaded ${products.length} Marco products`);
  console.log(`Approved override entries in file: ${overrideFileCount}`);
  if (args.productIds?.length) {
    console.log(`Filtered by --product-ids-file: ${args.productIds.length} ids`);
  }
  if (args.models?.length) {
    console.log(`Filtered by --models: ${args.models.join(",")}`);
  }

  const previousNotReady = (() => {
    try {
      if (fs.existsSync(PREVIOUS_NOT_READY_PATH)) {
        return JSON.parse(fs.readFileSync(PREVIOUS_NOT_READY_PATH, "utf8"));
      }
    } catch {
      /* ignore */
    }
    // Fallback snapshot of the 16 approved-not-ready from prior dry-run.
    return [
      { productId: null, title: "LG F2V5GG2S", status: "NO_VALID_IMAGES" },
      { productId: null, title: "LG F2V3GS4W", status: "NO_VALID_IMAGES" },
      { productId: null, title: "LG F2T9GW9P 8․5 կգ", status: "NO_VALID_IMAGES" },
      { productId: null, title: "LG F18L2CRV2T2", status: "NO_VALID_IMAGES" },
      { productId: null, title: "LG F-4J3TS2W", status: "NO_VALID_IMAGES" },
      { productId: null, title: "LG F-2J3HS8J 7 կգ", status: "NO_VALID_IMAGES" },
      { productId: null, title: "LG  F2V9GW9P", status: "NO_VALID_IMAGES" },
      { productId: null, title: "LG  F2V7GW1W", status: "NO_VALID_IMAGES" },
      { productId: null, title: "HISENSE WFQP8014EVM", status: "NO_VALID_IMAGES" },
      { productId: null, title: "Hisense WFQP7012EVM", status: "NO_VALID_IMAGES" },
      { productId: null, title: "HISENSE WFQP6012EVM", status: "PAGE_FETCH_FAILED" },
      { productId: null, title: "Hisense WFQA1214EVJMT", status: "NO_VALID_IMAGES" },
      { productId: null, title: "HISENSE WF3S8043BB3", status: "NO_VALID_IMAGES" },
      { productId: null, title: "HISENS WF3S1043BB3", status: "PAGE_FETCH_FAILED" },
      { productId: null, title: "Midea AF-18N8D0", status: "NO_VALID_IMAGES" },
      { productId: null, title: "Midea AF-12N8D1", status: "NO_VALID_IMAGES" },
    ];
  })();

  // Dry-run does not need DB during long HTTP discovery; release early.
  // Apply keeps connection — but ALREADY_OFFICIAL needs R2/public checks only.
  if (!args.apply) {
    await mobee.end();
  }

  const cache = loadCache();
  const results = await mapPool(products, args.concurrency, async (product) => {
    process.stdout.write(`.`);
    try {
      const plan = await processProduct(product, args, cache, r2, overrides);
      if (args.apply) {
        if (
          plan.action === "READY_TO_REPLACE" ||
          plan.action === "SKIP_ALREADY_OFFICIAL"
        ) {
          const applyResult = await applyProductReplace(
            mobee,
            r2,
            product,
            plan,
            args
          );
          return { ...plan, applyResult };
        }
      }
      return plan;
    } catch (err) {
      const brand = resolveBrandKey(product);
      const extractedModel = extractModelFromTitle(product.title || "");
      const overrideEntry = brand
        ? findOverrideEntryForTitle(
            overrides,
            brand,
            product.title || "",
            extractedModel
          )
        : null;
      const hasApprovedOverride = Boolean(
        overrideEntry?.approved && overrideEntry?.pageUrl
      );
      return {
        productId: product.id,
        title: product.title,
        brand,
        brandName: product.brand_name,
        extractedModel,
        normalizedModel: overrideEntry?.normalizedModel
          ? normalizeModelKey(overrideEntry.normalizedModel)
          : extractedModel
            ? normalizeModelKey(extractedModel)
            : null,
        matchType: overrideEntry?.matchType || null,
        hasApprovedOverride,
        officialPage: overrideEntry?.pageUrl || null,
        action: "ERROR",
        status: "ERROR",
        approvedStatus: hasApprovedOverride ? "OTHER" : null,
        manualReviewReason: err.message,
        error: err.message,
      };
    }
  });
  process.stdout.write("\n");

  saveCache(cache);

  // Attach productIds to previousNotReady by title match for reporting.
  const prevResolved = previousNotReady.map((prev) => {
    const hit = results.find(
      (r) =>
        r.title === prev.title ||
        (prev.productId && r.productId === prev.productId)
    );
    return { ...prev, productId: hit?.productId || prev.productId };
  });

  const summary = summarize(results.filter((r) => r.brand));
  const cdnAggregated = aggregateCdnCandidates(results);
  const smoke = pickSmokeTests(results);

  const approvedRows = results.filter((r) => r.hasApprovedOverride);
  const approvedPages = approvedRows.length;
  const statusCounts = {
    READY: 0,
    ALREADY_OFFICIAL: 0,
    NO_VALID_IMAGES: 0,
    PAGE_FETCH_FAILED: 0,
    MODEL_MISMATCH: 0,
    EXTRACTION_FAILED: 0,
    OTHER: 0,
  };
  for (const row of approvedRows) {
    const bucket = approvedStatusBucket(row) || "OTHER";
    statusCounts[bucket] = (statusCounts[bucket] || 0) + 1;
  }
  const approvedStatusSum = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const reportTotalMismatch = approvedStatusSum !== approvedPages;

  const hisenseReady = results.filter(
    (r) => r.brand === "hisense" && approvedStatusBucket(r) === "READY"
  ).length;
  const hisenseAlready = results.filter(
    (r) => r.brand === "hisense" && approvedStatusBucket(r) === "ALREADY_OFFICIAL"
  ).length;
  const hisenseQrReady = results.filter(
    (r) =>
      r.brand === "hisense" &&
      r.matchType === "SUPPORT_PAGE" &&
      (approvedStatusBucket(r) === "READY" ||
        approvedStatusBucket(r) === "ALREADY_OFFICIAL")
  ).length;
  const lgReady = results.filter(
    (r) =>
      r.brand === "lg" &&
      (approvedStatusBucket(r) === "READY" ||
        approvedStatusBucket(r) === "ALREADY_OFFICIAL")
  ).length;

  const applyStats = {
    productsApplied: results.filter((r) => r.applyResult?.ok && !r.applyResult?.reused).length,
    productsReused: results.filter((r) => r.applyResult?.reused).length,
    productsSkippedNoImages: results.filter(
      (r) =>
        r.hasApprovedOverride &&
        approvedStatusBucket(r) === "NO_VALID_IMAGES"
    ).length,
    officialImagesUploaded: results.reduce(
      (n, r) => n + (r.applyResult?.uploaded || 0),
      0
    ),
    officialImagesReused: results.reduce(
      (n, r) =>
        n +
        (r.applyResult?.reused
          ? (r.currentOfficialUrls || r.validatedImages || []).length
          : 0),
      0
    ),
  };

  const report = {
    mode: args.apply ? "APPLY" : "DRY_RUN",
    generatedAt: new Date().toISOString(),
    args,
    totals: {
      products: results.length,
      overrideFileCount,
      approvedPages,
      noApprovedPage: results.length - approvedPages,
      ...statusCounts,
      approvedStatusSum,
      reportTotalMismatch,
      hisenseReadyOrOfficial: hisenseReady + hisenseAlready,
      hisenseQrReadyOrOfficial: hisenseQrReady,
      lgReadyOrOfficial: lgReady,
      cdnCandidateHosts: cdnAggregated.length,
      errors: results.filter((r) => r.action === "ERROR").length,
      ...(args.apply ? applyStats : {}),
    },
    summaryByBrand: summary,
    cdnCandidates: cdnAggregated,
    previousNotReadyDelta: prevResolved,
    products: results,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  printSummaryTable(summary);
  printManualImageTable(results);
  printFocusReports(results, prevResolved);
  printSmokeTests(smoke);

  console.log("\n## Totals");
  console.log(JSON.stringify(report.totals, null, 2));
  console.log(
    `\napprovedStatusSum=${approvedStatusSum} approvedPages=${approvedPages} match=${!reportTotalMismatch}`
  );
  console.log(`\nReport: ${REPORT_PATH}`);
  console.log(`Cache: ${CACHE_PATH}`);
  console.log(`Overrides: ${OVERRIDES_PATH}`);

  if (reportTotalMismatch) {
    console.error("\nREPORT_TOTAL_MISMATCH");
    if (args.apply) await mobee.end().catch(() => undefined);
    process.exitCode = 1;
    return;
  }

  if (!args.apply) {
    console.log("\nDry-run only. Use --apply (without --delete-old-images) to write READY products.");
  } else {
    // Post-apply remaining Marco URLs / official coverage
    const remaining = await mobee.query(
      `
      SELECT p.id, pt.title, p.media::text AS media_text
      FROM products p
      LEFT JOIN product_translations pt ON pt."productId" = p.id AND pt.locale = 'en'
      WHERE EXISTS (
        SELECT 1 FROM product_variants v
        WHERE v."productId" = p.id AND v.source = $1
      )
      `,
      [SOURCE_NAME]
    );
    let marcoRemaining = 0;
    let withoutOfficial = 0;
    for (const row of remaining.rows) {
      const text = String(row.media_text || "");
      if (/marco\.am|products\/marco\//i.test(text)) marcoRemaining += 1;
      if (!/products\/official\//i.test(text)) withoutOfficial += 1;
    }
    console.log("\n## Apply summary");
    console.log(
      JSON.stringify(
        {
          ...applyStats,
          marcoUrlRemainingProducts: marcoRemaining,
          productsWithoutOfficialImages: withoutOfficial,
          dbFieldsChangedBesidesMedia: 0,
        },
        null,
        2
      )
    );
    await mobee.end();
  }
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
