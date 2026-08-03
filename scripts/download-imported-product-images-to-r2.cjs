/**
 * Download images for Marco-imported Mobee products into Mobee R2.
 *
 * - Mobee: DIRECT_URL
 * - Marco: MARCO_DIRECT_URL (READ ONLY) for restoring lost media URLs
 *
 * Usage:
 *   node scripts/download-imported-product-images-to-r2.cjs
 *   node scripts/download-imported-product-images-to-r2.cjs --apply --allow-partial
 *   node scripts/download-imported-product-images-to-r2.cjs --apply --product-id=<mobeeId>
 *   node scripts/download-imported-product-images-to-r2.cjs --apply --source-product-id=<marcoId>
 */
"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { Client } = require("pg");
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3");

const SOURCE_NAME = "marco";
const R2_KEY_PREFIX = "products/marco";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 30000;
const DEFAULT_CONCURRENCY = 3;
const REPORT_PATH = path.join(
  process.cwd(),
  "scripts",
  "download-imported-product-images-to-r2.dry-run.json"
);

const CONTENT_TYPE_EXT = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const GROUP_BRAND_ALIASES = {
  "samsung-tv": ["samsung"],
  "bosch-refrigerators": ["bosch"],
  "lg-washing-machines": ["lg"],
  "hisense-washing-machines": ["hisense"],
  "midea-air-conditioners": ["midea"],
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
    allowPartial: false,
    limit: null,
    productId: null,
    sourceProductId: null,
    group: null,
    concurrency: DEFAULT_CONCURRENCY,
    help: false,
  };
  for (const raw of argv) {
    if (raw === "--apply") args.apply = true;
    else if (raw === "--allow-partial") args.allowPartial = true;
    else if (raw.startsWith("--limit=")) {
      const n = Number(raw.slice("--limit=".length));
      if (!Number.isFinite(n) || n < 1) throw new Error("Invalid --limit");
      args.limit = Math.floor(n);
    } else if (raw.startsWith("--product-id=")) {
      args.productId = raw.slice("--product-id=".length).trim();
      if (!args.productId) throw new Error("Invalid --product-id");
    } else if (raw.startsWith("--source-product-id=")) {
      args.sourceProductId = raw.slice("--source-product-id=".length).trim();
      if (!args.sourceProductId) throw new Error("Invalid --source-product-id");
    } else if (raw.startsWith("--group=")) {
      args.group = raw.slice("--group=".length).trim();
      if (!GROUP_BRAND_ALIASES[args.group]) {
        throw new Error(
          `Unknown group. Supported: ${Object.keys(GROUP_BRAND_ALIASES).join(", ")}`
        );
      }
    } else if (raw.startsWith("--concurrency=")) {
      const n = Number(raw.slice("--concurrency=".length));
      if (!Number.isFinite(n) || n < 1) throw new Error("Invalid --concurrency");
      args.concurrency = Math.floor(n);
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
    return new URL(String(url).replace(/^postgresql:/i, "http:")).host;
  } catch {
    return "unknown-host";
  }
}

function createDbClient(connectionString) {
  return new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
    statement_timeout: 180000,
  });
}

function createR2Client(env) {
  const accountId = env.R2_ACCOUNT_ID;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const bucket = env.R2_BUCKET_NAME;
  const publicUrl = env.R2_PUBLIC_URL;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new Error(
      "Missing R2 env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL"
    );
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

function isMobeeR2Url(url, r2) {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.host === r2.publicHost || url.startsWith(r2.publicUrlBase);
  } catch {
    return false;
  }
}

function isHttpUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url.trim());
}

function collectUrlsFromDescription(description) {
  const urls = [];
  const seen = new Set();
  const add = (u) => {
    if (!isHttpUrl(u)) return;
    const cleaned = u.trim().replace(/[),.;]+$/g, "");
    if (seen.has(cleaned)) return;
    seen.add(cleaned);
    urls.push(cleaned);
  };

  const walk = (node) => {
    if (node == null) return;
    if (typeof node === "string") {
      const re = /https?:\/\/[^\s"'<>]+/gi;
      let m;
      while ((m = re.exec(node)) !== null) add(m[0]);
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (typeof node === "object") {
      for (const [key, value] of Object.entries(node)) {
        if (
          /image|url|src|photo|media|picture/i.test(key) &&
          typeof value === "string"
        ) {
          add(value);
        }
        walk(value);
      }
    }
  };
  walk(description);
  return urls;
}

function padIndex(n) {
  return String(n).padStart(2, "0");
}

function extFromContentType(contentType) {
  const base = String(contentType || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  return CONTENT_TYPE_EXT[base] || null;
}

function extFromUrl(url) {
  try {
    const raw = path.extname(new URL(url).pathname).toLowerCase().replace(/[^a-z0-9]/g, "");
    if (raw === "jpeg") return "jpg";
    if (["jpg", "png", "webp", "gif", "avif"].includes(raw)) return raw;
  } catch {
    /* ignore */
  }
  return null;
}

function resolveMarcoProductId(sourcePids) {
  for (const pid of sourcePids) {
    if (!pid) continue;
    const match = String(pid).match(/^marco-product-(.+)-default$/);
    if (match) return match[1];
  }
  // Regular Marco variant ids belong to a product; product id resolved via Marco lookup.
  return null;
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

async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  }
  const runners = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    () => run()
  );
  await Promise.all(runners);
  return results;
}

function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    let settled = false;
    const finish = (err, value) => {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve(value);
    };

    const req = lib.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,ru;q=0.8",
          Referer: "https://marco.am/",
        },
        timeout: FETCH_TIMEOUT_MS,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          fetchImage(res.headers.location).then(
            (v) => finish(null, v),
            (e) => finish(e)
          );
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          finish(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const contentType = String(res.headers["content-type"] || "");
        const chunks = [];
        let total = 0;
        res.on("data", (chunk) => {
          total += chunk.length;
          if (total > MAX_IMAGE_BYTES) {
            req.destroy();
            finish(new Error(`Image exceeds MAX_IMAGE_BYTES (${MAX_IMAGE_BYTES})`));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          finish(null, {
            buffer: Buffer.concat(chunks),
            contentType,
            statusCode: res.statusCode,
          });
        });
        res.on("error", (err) => finish(err));
      }
    );
    req.on("timeout", () => {
      req.destroy();
      finish(new Error("timeout"));
    });
    req.on("error", (err) => finish(err));
  });
}

async function headOk(url) {
  return new Promise((resolve) => {
    try {
      const lib = url.startsWith("https") ? https : http;
      const req = lib.request(url, { method: "HEAD", timeout: 15000 }, (res) => {
        res.resume();
        resolve({
          url,
          statusCode: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 400,
        });
      });
      req.on("timeout", () => {
        req.destroy();
        resolve({ url, statusCode: null, ok: false, error: "timeout" });
      });
      req.on("error", (err) => {
        resolve({ url, statusCode: null, ok: false, error: err.message });
      });
      req.end();
    } catch (err) {
      resolve({ url, statusCode: null, ok: false, error: err.message });
    }
  });
}

async function r2ObjectExists(r2, key) {
  try {
    await r2.client.send(
      new HeadObjectCommand({ Bucket: r2.bucket, Key: key })
    );
    return true;
  } catch {
    return false;
  }
}

async function deleteR2Keys(r2, keys) {
  const deleted = [];
  const failed = [];
  for (const key of keys) {
    try {
      await r2.client.send(
        new DeleteObjectCommand({ Bucket: r2.bucket, Key: key })
      );
      deleted.push(key);
    } catch (err) {
      failed.push({ key, message: err.message });
    }
  }
  return { deleted, failed };
}

async function loadMobeeMarcoProducts(mobee, args) {
  const params = [SOURCE_NAME];
  const filters = [`p."deletedAt" IS NULL`];

  if (args.productId) {
    params.push(args.productId);
    filters.push(`p.id = $${params.length}`);
  }

  if (args.group) {
    const aliases = GROUP_BRAND_ALIASES[args.group];
    params.push(aliases.map((a) => normalizeText(a)));
    filters.push(`(
      lower(b.slug) = ANY($${params.length}::text[])
      OR EXISTS (
        SELECT 1 FROM brand_translations bt
        WHERE bt."brandId" = b.id
          AND lower(bt.name) = ANY($${params.length}::text[])
      )
    )`);
  }

  let limitSql = "";
  if (args.limit != null) {
    params.push(args.limit);
    limitSql = ` LIMIT $${params.length}`;
  }

  const { rows } = await mobee.query(
    `
    SELECT
      p.id,
      p.media,
      b.slug AS brand_slug,
      COALESCE(
        (
          SELECT bt.name FROM brand_translations bt
          WHERE bt."brandId" = b.id
          ORDER BY CASE bt.locale WHEN 'en' THEN 1 WHEN 'ru' THEN 2 ELSE 3 END
          LIMIT 1
        ),
        b.slug
      ) AS brand_name,
      (
        SELECT json_agg(json_build_object(
          'id', v.id,
          'imageUrl', v."imageUrl",
          'media', to_jsonb(v.media),
          'source', v.source,
          'sourcePid', v."sourcePid",
          'position', v.position
        ) ORDER BY v.position, v.id)
        FROM product_variants v
        WHERE v."productId" = p.id
      ) AS variants,
      (
        SELECT json_agg(json_build_object(
          'locale', t.locale,
          'title', t.title,
          'descriptionHtml', t."descriptionHtml"
        ))
        FROM product_translations t
        WHERE t."productId" = p.id
      ) AS translations
    FROM products p
    JOIN brands b ON b.id = p."brandId"
    WHERE EXISTS (
      SELECT 1 FROM product_variants v
      WHERE v."productId" = p.id AND v.source = $1
    )
      AND ${filters.join(" AND ")}
    ORDER BY p."updatedAt" DESC
    ${limitSql}
    `,
    params
  );
  return rows;
}

async function loadMarcoProductsByIds(marco, productIds) {
  if (!productIds.length) return new Map();
  const { rows } = await marco.query(
    `
    SELECT
      p.id,
      p.media,
      (
        SELECT json_agg(json_build_object(
          'id', v.id,
          'imageUrl', v."imageUrl"
        ) ORDER BY v.position, v.id)
        FROM product_variants v
        WHERE v."productId" = p.id
      ) AS variants,
      (
        SELECT json_agg(json_build_object(
          'locale', t.locale,
          'description', t.description
        ))
        FROM product_translations t
        WHERE t."productId" = p.id
      ) AS translations
    FROM products p
    WHERE p.id = ANY($1::text[])
    `,
    [productIds]
  );
  return new Map(rows.map((r) => [r.id, r]));
}

async function resolveMarcoProductIdsFromVariants(marco, sourcePids) {
  const plain = sourcePids.filter(
    (pid) => pid && !String(pid).startsWith("marco-product-")
  );
  if (!plain.length) return new Map();
  const { rows } = await marco.query(
    `
    SELECT id, "productId"
    FROM product_variants
    WHERE id = ANY($1::text[])
    `,
    [plain]
  );
  return new Map(rows.map((r) => [r.id, r.productId]));
}

function buildCanonicalGallery(mobeeProduct, marcoProduct, r2) {
  const mobeeMedia = normalizeMediaList(mobeeProduct.media);
  const marcoMedia = normalizeMediaList(marcoProduct?.media || []);
  const title =
    (mobeeProduct.translations || []).find((t) => t.title)?.title || "";

  // Prefer Marco ordered media when Mobee gallery was truncated/lost.
  const base =
    marcoMedia.length >= mobeeMedia.length && marcoMedia.length > 0
      ? marcoMedia
      : mobeeMedia.length > 0
        ? mobeeMedia
        : marcoMedia;

  const slots = base.map((item, index) => {
    const candidates = [];
    const addCandidate = (url, source) => {
      if (!isHttpUrl(url)) return;
      if (candidates.some((c) => c.url === url)) return;
      candidates.push({ url, source });
    };

    // Prefer already-migrated Mobee R2 at same index.
    if (mobeeMedia[index] && isMobeeR2Url(mobeeMedia[index].url, r2)) {
      addCandidate(mobeeMedia[index].url, "mobee-r2-index");
    }
    addCandidate(item.url, "canonical");
    if (marcoMedia[index]) addCandidate(marcoMedia[index].url, "marco-media");
    if (mobeeMedia[index]) addCandidate(mobeeMedia[index].url, "mobee-media");

    return {
      index,
      alt: item.alt || mobeeMedia[index]?.alt || title || "",
      preferredUrl: item.url,
      candidates,
    };
  });

  // If Mobee has extra R2 images beyond base length, append them.
  for (let i = base.length; i < mobeeMedia.length; i += 1) {
    const item = mobeeMedia[i];
    slots.push({
      index: i,
      alt: item.alt || title || "",
      preferredUrl: item.url,
      candidates: [{ url: item.url, source: "mobee-extra" }],
    });
  }

  // Alternatives from variants / descriptions (for fetch fallback only).
  const altPool = [];
  const addAlt = (url, source) => {
    if (!isHttpUrl(url)) return;
    if (altPool.some((a) => a.url === url)) return;
    altPool.push({ url, source });
  };

  for (const v of mobeeProduct.variants || []) {
    addAlt(v.imageUrl, "mobee-variant-imageUrl");
    for (const m of normalizeMediaList(v.media)) addAlt(m.url, "mobee-variant-media");
  }
  for (const v of marcoProduct?.variants || []) {
    addAlt(v.imageUrl, "marco-variant-imageUrl");
  }
  for (const t of marcoProduct?.translations || []) {
    for (const u of collectUrlsFromDescription(t.description)) {
      addAlt(u, "marco-description");
    }
  }
  for (const t of mobeeProduct.translations || []) {
    for (const u of collectUrlsFromDescription(t.descriptionHtml)) {
      addAlt(u, "mobee-descriptionHtml");
    }
  }

  for (const slot of slots) {
    for (const alt of altPool) {
      if (slot.candidates.some((c) => c.url === alt.url)) continue;
      // Only attach alternatives that look like same filename or same host path basename.
      try {
        const slotBase = path.basename(new URL(slot.preferredUrl).pathname);
        const altBase = path.basename(new URL(alt.url).pathname);
        if (slotBase && altBase && slotBase === altBase) {
          slot.candidates.push(alt);
        }
      } catch {
        /* ignore */
      }
    }
  }

  return slots;
}

async function processSlot(slot, ctx) {
  const { r2, marcoProductId, allowPartial } = ctx;
  const keyBase = `${R2_KEY_PREFIX}/${marcoProductId}/image-${padIndex(
    slot.index + 1
  )}`;

  // Already Mobee R2 in candidates?
  for (const candidate of slot.candidates) {
    if (isMobeeR2Url(candidate.url, r2)) {
      return {
        index: slot.index,
        alt: slot.alt,
        action: "ALREADY_R2",
        url: candidate.url,
        sourceUrl: candidate.url,
        key: null,
        uploaded: false,
        preservedExternal: false,
        http403: false,
        broken: false,
      };
    }
  }

  // Reuse deterministic key if object already exists.
  for (const ext of ["jpg", "png", "webp", "gif", "avif"]) {
    const key = `${keyBase}.${ext}`;
    if (await r2ObjectExists(r2, key)) {
      const url = `${r2.publicUrlBase}/${key}`;
      return {
        index: slot.index,
        alt: slot.alt,
        action: "REUSED_R2_KEY",
        url,
        sourceUrl: slot.preferredUrl,
        key,
        uploaded: false,
        preservedExternal: false,
        http403: false,
        broken: false,
      };
    }
  }

  const errors = [];
  for (const candidate of slot.candidates) {
    try {
      const fetched = await fetchImage(candidate.url);
      if (!fetched.buffer?.length) {
        errors.push({ url: candidate.url, error: "empty" });
        continue;
      }
      if (!String(fetched.contentType).toLowerCase().startsWith("image/")) {
        errors.push({
          url: candidate.url,
          error: `content-type ${fetched.contentType}`,
        });
        continue;
      }
      const ext =
        extFromContentType(fetched.contentType) ||
        extFromUrl(candidate.url) ||
        "jpg";
      const key = `${keyBase}.${ext}`;
      const contentType = String(fetched.contentType).split(";")[0].trim();
      await r2.client.send(
        new PutObjectCommand({
          Bucket: r2.bucket,
          Key: key,
          Body: fetched.buffer,
          ContentType: contentType,
        })
      );
      return {
        index: slot.index,
        alt: slot.alt,
        action: "UPLOADED",
        url: `${r2.publicUrlBase}/${key}`,
        sourceUrl: candidate.url,
        key,
        uploaded: true,
        preservedExternal: false,
        http403: false,
        broken: false,
        bytes: fetched.buffer.length,
        contentType,
      };
    } catch (err) {
      const message = err.message || String(err);
      errors.push({ url: candidate.url, error: message });
    }
  }

  const http403 = errors.some((e) => /HTTP 403/i.test(e.error));
  const preservedUrl = slot.preferredUrl;

  if (allowPartial) {
    return {
      index: slot.index,
      alt: slot.alt,
      action: "FETCH_FAILED_PRESERVED",
      url: preservedUrl,
      sourceUrl: preservedUrl,
      key: null,
      uploaded: false,
      preservedExternal: true,
      http403,
      broken: !http403,
      errors,
    };
  }

  const err = new Error(
    `FAILED_INCOMPLETE_GALLERY index=${slot.index} preferred=${preservedUrl}`
  );
  err.code = "FAILED_INCOMPLETE_GALLERY";
  err.http403 = http403;
  err.errors = errors;
  throw err;
}

async function updateProductTx(mobee, productId, newMedia, variants, r2) {
  await mobee.query("BEGIN");
  try {
    await mobee.query(
      `
      UPDATE products
      SET media = ${jsonbArrayParam(2)},
          "updatedAt" = NOW()
      WHERE id = $1
      `,
      [productId, JSON.stringify(newMedia)]
    );

    const firstUrl =
      newMedia.find((m) => isMobeeR2Url(m.url, r2))?.url ||
      newMedia[0]?.url ||
      null;
    for (const variant of variants || []) {
      await mobee.query(
        `
        UPDATE product_variants
        SET "imageUrl" = $2,
            media = ${jsonbArrayParam(3)},
            "updatedAt" = NOW()
        WHERE id = $1
        `,
        [variant.id, firstUrl, JSON.stringify(newMedia)]
      );
    }

    await mobee.query("COMMIT");
  } catch (err) {
    await mobee.query("ROLLBACK");
    throw err;
  }
}

function summarizePlan(plan) {
  return {
    productId: plan.productId,
    marcoProductId: plan.marcoProductId,
    brand: plan.brand,
    title: plan.title,
    slotCount: plan.slots.length,
    needsWork: plan.needsWork,
    alreadyR2Slots: plan.slots.filter((s) =>
      s.candidates.some((c) => c.source === "mobee-r2-index")
    ).length,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage:
  node scripts/download-imported-product-images-to-r2.cjs [--apply] [--allow-partial]
    [--limit=N] [--product-id=ID] [--source-product-id=MARCO_ID]
    [--group=NAME] [--concurrency=N]`);
    return;
  }

  const env = loadEnv(path.join(process.cwd(), ".env"));
  if (!env.DIRECT_URL) throw new Error("Missing DIRECT_URL");
  if (!env.MARCO_DIRECT_URL) throw new Error("Missing MARCO_DIRECT_URL");

  const r2 = createR2Client(env);
  const mobee = createDbClient(env.DIRECT_URL);
  const marco = createDbClient(env.MARCO_DIRECT_URL);
  await mobee.connect();
  await marco.connect();

  const report = {
    mode: args.apply ? "APPLY" : "DRY_RUN",
    generatedAt: new Date().toISOString(),
    mobeeHost: hostOf(env.DIRECT_URL),
    marcoHost: hostOf(env.MARCO_DIRECT_URL),
    r2PublicHost: r2.publicHost,
    args,
    totals: {
      productsProcessed: 0,
      productsCompleted: 0,
      productsPartial: 0,
      productsFailed: 0,
      productsNoWork: 0,
      imagesFound: 0,
      imagesUploaded: 0,
      imagesReused: 0,
      imagesPreservedExternal: 0,
      imagesAlreadyR2: 0,
      brokenSourceUrls: 0,
      http403Count: 0,
      externalMediaRemaining: 0,
      externalVariantImageUrlRemaining: 0,
      externalVariantMediaRemaining: 0,
      r2Http200: 0,
      r2HttpFailed: 0,
    },
    incompleteGalleries: [],
    products: [],
    applyResults: [],
  };

  try {
    await mobee.query("BEGIN READ ONLY");
    await marco.query("BEGIN READ ONLY");

    let products = await loadMobeeMarcoProducts(mobee, args);

    // Resolve Marco product ids via variant sourcePid.
    const allSourcePids = [];
    for (const p of products) {
      for (const v of p.variants || []) {
        if (v.source === SOURCE_NAME && v.sourcePid) allSourcePids.push(v.sourcePid);
      }
    }
    const variantToProduct = await resolveMarcoProductIdsFromVariants(
      marco,
      allSourcePids
    );

    const enriched = [];
    for (const product of products) {
      const sourcePids = (product.variants || [])
        .filter((v) => v.source === SOURCE_NAME)
        .map((v) => v.sourcePid)
        .filter(Boolean);
      let marcoProductId = resolveMarcoProductId(sourcePids);
      if (!marcoProductId) {
        for (const pid of sourcePids) {
          if (variantToProduct.has(pid)) {
            marcoProductId = variantToProduct.get(pid);
            break;
          }
        }
      }
      if (args.sourceProductId && marcoProductId !== args.sourceProductId) {
        continue;
      }
      enriched.push({ ...product, marcoProductId, sourcePids });
    }
    products = enriched;

    const marcoIds = [
      ...new Set(products.map((p) => p.marcoProductId).filter(Boolean)),
    ];
    const marcoMap = await loadMarcoProductsByIds(marco, marcoIds);

    await mobee.query("COMMIT");
    await marco.query("COMMIT");

    const plans = [];
    for (const product of products) {
      const marcoProduct = product.marcoProductId
        ? marcoMap.get(product.marcoProductId) || null
        : null;
      const slots = buildCanonicalGallery(product, marcoProduct, r2);
      const title =
        (product.translations || []).find((t) => t.locale === "en")?.title ||
        (product.translations || []).find((t) => t.title)?.title ||
        product.id;

      const needsWork = slots.some((slot) => {
        const hasR2 = slot.candidates.some((c) => isMobeeR2Url(c.url, r2));
        return !hasR2;
      }) || slots.length !== normalizeMediaList(product.media).length;

      // Also need work if media count differs from canonical (restore truncated gallery).
      const mediaCountDiffers =
        normalizeMediaList(product.media).length !== slots.length;

      plans.push({
        productId: product.id,
        marcoProductId: product.marcoProductId,
        brand: product.brand_name || product.brand_slug,
        title,
        variants: product.variants || [],
        slots,
        needsWork: needsWork || mediaCountDiffers,
        marcoMediaCount: normalizeMediaList(marcoProduct?.media || []).length,
        mobeeMediaCount: normalizeMediaList(product.media).length,
      });
    }

    report.totals.productsProcessed = plans.length;
    report.totals.imagesFound = plans.reduce((n, p) => n + p.slots.length, 0);

    // Dry-run probe of accessibility (limited concurrency).
    const probeResults = await mapPool(plans, args.concurrency, async (plan) => {
      const slotResults = [];
      for (const slot of plan.slots) {
        const alreadyR2 = slot.candidates.some((c) => isMobeeR2Url(c.url, r2));
        if (alreadyR2) {
          slotResults.push({
            index: slot.index,
            status: "ALREADY_R2",
            url: slot.candidates.find((c) => isMobeeR2Url(c.url, r2)).url,
          });
          continue;
        }
        let ok = false;
        let status = "BROKEN";
        let lastError = null;
        for (const candidate of slot.candidates) {
          try {
            const fetched = await fetchImage(candidate.url);
            if (
              fetched.buffer?.length &&
              String(fetched.contentType).toLowerCase().startsWith("image/")
            ) {
              ok = true;
              status = "DOWNLOADABLE";
              break;
            }
          } catch (err) {
            lastError = err.message;
            if (/HTTP 403/i.test(err.message)) status = "HTTP_403";
          }
        }
        slotResults.push({
          index: slot.index,
          status: ok ? "DOWNLOADABLE" : status,
          url: slot.preferredUrl,
          error: ok ? null : lastError,
        });
      }
      return { productId: plan.productId, slotResults, plan };
    });

    let downloadable = 0;
    let http403 = 0;
    let broken = 0;
    let alreadyR2 = 0;
    for (const item of probeResults) {
      const productEntry = {
        ...summarizePlan(item.plan),
        slots: item.slotResults,
      };
      report.products.push(productEntry);
      for (const slot of item.slotResults) {
        if (slot.status === "ALREADY_R2") alreadyR2 += 1;
        else if (slot.status === "DOWNLOADABLE") downloadable += 1;
        else if (slot.status === "HTTP_403") http403 += 1;
        else broken += 1;
      }
      const incomplete = item.slotResults.some(
        (s) => s.status === "HTTP_403" || s.status === "BROKEN"
      );
      if (incomplete) {
        report.incompleteGalleries.push({
          productId: item.plan.productId,
          marcoProductId: item.plan.marcoProductId,
          title: item.plan.title,
          mobeeMediaCount: item.plan.mobeeMediaCount,
          canonicalCount: item.plan.slots.length,
          failedSlots: item.slotResults
            .filter((s) => s.status !== "ALREADY_R2" && s.status !== "DOWNLOADABLE")
            .map((s) => ({ index: s.index, status: s.status, url: s.url })),
        });
      }
    }

    report.dryRunStats = {
      importedProducts: plans.length,
      imagesFound: report.totals.imagesFound,
      downloadable,
      http403,
      broken,
      alreadyInMobeeR2: alreadyR2,
      willUpload: downloadable,
      incompleteGalleries: report.incompleteGalleries.length,
    };

    if (args.apply) {
      for (const plan of plans) {
        if (!plan.marcoProductId) {
          report.totals.productsFailed += 1;
          report.applyResults.push({
            productId: plan.productId,
            ok: false,
            reason: "MISSING_MARCO_PRODUCT_ID",
          });
          continue;
        }

        const uploadedKeys = [];
        try {
          const slotOutcomes = [];
          for (const slot of plan.slots) {
            const outcome = await processSlot(slot, {
              r2,
              marcoProductId: plan.marcoProductId,
              allowPartial: args.allowPartial,
            });
            if (outcome.uploaded && outcome.key) uploadedKeys.push(outcome.key);
            slotOutcomes.push(outcome);
          }

          const newMedia = slotOutcomes.map((s) => ({
            url: s.url,
            alt: s.alt || "",
          }));

          await updateProductTx(
            mobee,
            plan.productId,
            newMedia,
            plan.variants.filter((v) => v.source === SOURCE_NAME),
            r2
          );

          const preserved = slotOutcomes.filter((s) => s.preservedExternal).length;
          const uploaded = slotOutcomes.filter((s) => s.uploaded).length;
          const reused = slotOutcomes.filter(
            (s) => s.action === "REUSED_R2_KEY" || s.action === "ALREADY_R2"
          ).length;
          const http403Count = slotOutcomes.filter((s) => s.http403).length;

          report.totals.imagesUploaded += uploaded;
          report.totals.imagesReused += reused;
          report.totals.imagesPreservedExternal += preserved;
          report.totals.imagesAlreadyR2 += slotOutcomes.filter(
            (s) => s.action === "ALREADY_R2"
          ).length;
          report.totals.http403Count += http403Count;
          report.totals.brokenSourceUrls += slotOutcomes.filter(
            (s) => s.broken
          ).length;

          if (preserved > 0) report.totals.productsPartial += 1;
          else report.totals.productsCompleted += 1;

          // Verify R2 URLs
          const r2Urls = newMedia
            .map((m) => m.url)
            .filter((u) => isMobeeR2Url(u, r2));
          for (const url of r2Urls) {
            const check = await headOk(url);
            if (check.ok) report.totals.r2Http200 += 1;
            else report.totals.r2HttpFailed += 1;
          }

          report.applyResults.push({
            productId: plan.productId,
            marcoProductId: plan.marcoProductId,
            ok: true,
            mediaCount: newMedia.length,
            uploaded,
            reused,
            preservedExternal: preserved,
            http403Count,
            uploadedKeys,
            newMedia,
            slots: slotOutcomes.map((s) => ({
              index: s.index,
              action: s.action,
              url: s.url,
              sourceUrl: s.sourceUrl,
            })),
          });
        } catch (err) {
          if (uploadedKeys.length) {
            await deleteR2Keys(r2, uploadedKeys);
          }
          report.totals.productsFailed += 1;
          report.applyResults.push({
            productId: plan.productId,
            marcoProductId: plan.marcoProductId,
            ok: false,
            reason: err.code || "ERROR",
            message: err.message,
            http403: Boolean(err.http403),
          });
          process.exitCode = 1;
        }
      }

      // Post-apply external URL remaining counts
      await mobee.query("BEGIN READ ONLY");
      const remaining = await mobee.query(
        `
        SELECT
          p.id,
          p.media,
          v."imageUrl",
          v.media AS variant_media
        FROM products p
        JOIN product_variants v ON v."productId" = p.id
        WHERE v.source = 'marco'
          AND p."deletedAt" IS NULL
        `
      );
      await mobee.query("COMMIT");

      for (const row of remaining.rows) {
        for (const m of normalizeMediaList(row.media)) {
          if (!isMobeeR2Url(m.url, r2)) report.totals.externalMediaRemaining += 1;
        }
        if (row.imageUrl && !isMobeeR2Url(row.imageUrl, r2)) {
          report.totals.externalVariantImageUrlRemaining += 1;
        }
        for (const m of normalizeMediaList(row.variant_media)) {
          if (!isMobeeR2Url(m.url, r2)) {
            report.totals.externalVariantMediaRemaining += 1;
          }
        }
      }
    }

    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");

    console.log("=== DOWNLOAD IMPORTED PRODUCT IMAGES → R2 ===");
    console.log(
      JSON.stringify(
        {
          mode: report.mode,
          mobeeHost: report.mobeeHost,
          marcoHost: report.marcoHost,
          r2PublicHost: report.r2PublicHost,
          reportPath: REPORT_PATH,
        },
        null,
        2
      )
    );
    console.log("\n## Dry-run / discovery stats");
    console.log(JSON.stringify(report.dryRunStats, null, 2));
    console.log("\n## Incomplete galleries");
    console.log(
      JSON.stringify(report.incompleteGalleries.slice(0, 30), null, 2)
    );
    if (args.apply) {
      console.log("\n## Totals");
      console.log(JSON.stringify(report.totals, null, 2));
      console.log("\n## Apply sample (first 10)");
      console.log(JSON.stringify(report.applyResults.slice(0, 10), null, 2));
    } else {
      console.log("\nDry-run only. Use --apply [--allow-partial] to write.");
    }
  } catch (err) {
    try {
      await mobee.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    try {
      await marco.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    await mobee.end().catch(() => {});
    await marco.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
