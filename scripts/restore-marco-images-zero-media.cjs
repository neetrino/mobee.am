"use strict";

/**
 * Dry-run / apply: restore Marco images for published Mobee products with ZERO media.
 *
 * MEDIA-ONLY. Never touches products that already have images.
 *
 * Usage:
 *   node scripts/restore-marco-images-zero-media.cjs
 *   node scripts/restore-marco-images-zero-media.cjs --apply
 *   node scripts/restore-marco-images-zero-media.cjs --apply --allow-partial
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { Client } = require("pg");
const {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} = require("@aws-sdk/client-s3");

const SOURCE_NAME = "marco";
const R2_KEY_PREFIX = "products/marco";
const EXPECTED_ZERO_MEDIA = 76;
const EXPECTED_WITH_IMAGE = 188;
const EXPECTED_TOTAL = 264;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 30000;
const DEFAULT_CONCURRENCY = 3;
const REPORT_PATH = path.join(
  process.cwd(),
  "scripts",
  "restore-marco-images-zero-media.dry-run.json",
);

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
    allowPartial: false,
    concurrency: DEFAULT_CONCURRENCY,
    help: false,
  };
  for (const raw of argv) {
    if (raw === "--apply") args.apply = true;
    else if (raw === "--allow-partial") args.allowPartial = true;
    else if (raw.startsWith("--concurrency=")) {
      const n = Number(raw.slice("--concurrency=".length));
      if (!Number.isFinite(n) || n < 1) throw new Error("Invalid --concurrency");
      args.concurrency = Math.floor(n);
    } else if (raw === "--help" || raw === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${raw}`);
  }
  return args;
}

function createDbClient(connectionString) {
  return new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
    statement_timeout: 300000,
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
      "Missing R2 env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL",
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

function productHasAnyImage(productMedia, variants) {
  if (normalizeMediaList(productMedia).length > 0) return true;
  for (const v of variants || []) {
    if (typeof v.imageUrl === "string" && v.imageUrl.trim()) return true;
    if (normalizeMediaList(v.media).length > 0) return true;
  }
  return false;
}

function isHttpUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url.trim());
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
    const raw = path
      .extname(new URL(url).pathname)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    if (raw === "jpeg") return "jpg";
    if (["jpg", "png", "webp", "gif", "avif"].includes(raw)) return raw;
  } catch {
    /* ignore */
  }
  return null;
}

function resolveMarcoProductIdFromSourcePids(sourcePids) {
  for (const pid of sourcePids) {
    if (!pid) continue;
    const match = String(pid).match(/^marco-product-(.+)-default$/);
    if (match) return match[1];
  }
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

function snapshotNonMediaFields(row) {
  return {
    brandId: row.brandId,
    skuPrefix: row.skuPrefix,
    published: row.published,
    featured: row.featured,
    publishedAt: row.publishedAt ? String(row.publishedAt) : null,
    categoryIds: [...(row.categoryIds || [])].sort(),
    primaryCategoryId: row.primaryCategoryId,
    attributeIds: [...(row.attributeIds || [])].sort(),
    discountPercent: row.discountPercent,
    translations: (row.translations || [])
      .map((t) => ({
        locale: t.locale,
        title: t.title,
        slug: t.slug,
        subtitle: t.subtitle,
        descriptionHtml: t.descriptionHtml,
        seoTitle: t.seoTitle,
        seoDescription: t.seoDescription,
      }))
      .sort((a, b) => a.locale.localeCompare(b.locale)),
    variants: (row.variants || [])
      .map((v) => ({
        id: v.id,
        sku: v.sku,
        barcode: v.barcode,
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        cost: v.cost,
        stock: v.stock,
        stockReserved: v.stockReserved,
        weightGrams: v.weightGrams,
        position: v.position,
        published: v.published,
        attributes: v.attributes,
        source: v.source,
        sourcePid: v.sourcePid,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
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
    () => run(),
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
            (e) => finish(e),
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
      },
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
    await r2.client.send(new HeadObjectCommand({ Bucket: r2.bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function loadProductSnapshotById(mobee, productId) {
  const { rows } = await mobee.query(
    `
    SELECT
      p.id,
      p."brandId",
      p."skuPrefix",
      p.media,
      p.published,
      p.featured,
      p."publishedAt",
      p."categoryIds",
      p."primaryCategoryId",
      p."attributeIds",
      p."discountPercent",
      (
        SELECT json_agg(json_build_object(
          'id', v.id,
          'sku', v.sku,
          'barcode', v.barcode,
          'price', v.price,
          'compareAtPrice', v."compareAtPrice",
          'cost', v.cost,
          'stock', v.stock,
          'stockReserved', v."stockReserved",
          'weightGrams', v."weightGrams",
          'imageUrl', v."imageUrl",
          'media', to_jsonb(v.media),
          'position', v.position,
          'published', v.published,
          'attributes', v.attributes,
          'source', v.source,
          'sourcePid', v."sourcePid"
        ) ORDER BY v.position, v.id)
        FROM product_variants v
        WHERE v."productId" = p.id
      ) AS variants,
      (
        SELECT json_agg(json_build_object(
          'locale', t.locale,
          'title', t.title,
          'slug', t.slug,
          'subtitle', t.subtitle,
          'descriptionHtml', t."descriptionHtml",
          'seoTitle', t."seoTitle",
          'seoDescription', t."seoDescription"
        ))
        FROM product_translations t
        WHERE t."productId" = p.id
      ) AS translations
    FROM products p
    WHERE p.id = $1
    `,
    [productId],
  );
  return rows[0] || null;
}

async function loadAllPublishedProducts(mobee) {
  const { rows } = await mobee.query(`
    SELECT
      p.id,
      p."brandId",
      p."skuPrefix",
      p.media,
      p.published,
      p.featured,
      p."publishedAt",
      p."categoryIds",
      p."primaryCategoryId",
      p."attributeIds",
      p."discountPercent",
      b.slug AS brand_slug,
      COALESCE(
        (
          SELECT bt.name FROM brand_translations bt
          WHERE bt."brandId" = b.id
          ORDER BY CASE bt.locale WHEN 'en' THEN 1 WHEN 'hy' THEN 2 WHEN 'ru' THEN 3 ELSE 4 END
          LIMIT 1
        ),
        b.slug
      ) AS brand_name,
      COALESCE(
        (
          SELECT ct.title FROM category_translations ct
          WHERE ct."categoryId" = p."primaryCategoryId"
          ORDER BY CASE ct.locale WHEN 'hy' THEN 1 WHEN 'en' THEN 2 WHEN 'ru' THEN 3 ELSE 4 END
          LIMIT 1
        ),
        (
          SELECT ct.title FROM category_translations ct
          WHERE ct."categoryId" = ANY(p."categoryIds")
          ORDER BY CASE ct.locale WHEN 'hy' THEN 1 WHEN 'en' THEN 2 WHEN 'ru' THEN 3 ELSE 4 END
          LIMIT 1
        ),
        ''
      ) AS category_title,
      (
        SELECT json_agg(json_build_object(
          'id', v.id,
          'sku', v.sku,
          'barcode', v.barcode,
          'price', v.price,
          'compareAtPrice', v."compareAtPrice",
          'cost', v.cost,
          'stock', v.stock,
          'stockReserved', v."stockReserved",
          'weightGrams', v."weightGrams",
          'imageUrl', v."imageUrl",
          'media', to_jsonb(v.media),
          'position', v.position,
          'published', v.published,
          'attributes', v.attributes,
          'source', v.source,
          'sourcePid', v."sourcePid"
        ) ORDER BY v.position, v.id)
        FROM product_variants v
        WHERE v."productId" = p.id
      ) AS variants,
      (
        SELECT json_agg(json_build_object(
          'locale', t.locale,
          'title', t.title,
          'slug', t.slug,
          'subtitle', t.subtitle,
          'descriptionHtml', t."descriptionHtml",
          'seoTitle', t."seoTitle",
          'seoDescription', t."seoDescription"
        ))
        FROM product_translations t
        WHERE t."productId" = p.id
      ) AS translations
    FROM products p
    LEFT JOIN brands b ON b.id = p."brandId"
    WHERE p."deletedAt" IS NULL
      AND p.published = true
    ORDER BY p.id
  `);
  return rows;
}

async function resolveMarcoProductIdsFromVariants(marco, sourcePids) {
  const plain = sourcePids.filter(
    (pid) => pid && !String(pid).startsWith("marco-product-"),
  );
  if (!plain.length) return new Map();
  const { rows } = await marco.query(
    `
    SELECT id, "productId"
    FROM product_variants
    WHERE id = ANY($1::text[])
    `,
    [plain],
  );
  return new Map(rows.map((r) => [r.id, r.productId]));
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
          'sku', v.sku,
          'imageUrl', v."imageUrl"
        ) ORDER BY v.position, v.id)
        FROM product_variants v
        WHERE v."productId" = p.id
      ) AS variants,
      (
        SELECT json_agg(json_build_object(
          'locale', t.locale,
          'title', t.title,
          'description', t.description
        ))
        FROM product_translations t
        WHERE t."productId" = p.id
      ) AS translations
    FROM products p
    WHERE p.id = ANY($1::text[])
    `,
    [productIds],
  );
  return new Map(rows.map((r) => [r.id, r]));
}

async function loadMarcoProductsBySkus(marco, skus) {
  const cleaned = [...new Set(skus.map((s) => String(s || "").trim()).filter(Boolean))];
  if (!cleaned.length) return new Map();
  const { rows } = await marco.query(
    `
    SELECT
      v.sku,
      v."productId",
      COUNT(*) OVER (PARTITION BY lower(v.sku)) AS sku_hit_count
    FROM product_variants v
    WHERE lower(v.sku) = ANY($1::text[])
    `,
    [cleaned.map((s) => s.toLowerCase())],
  );
  const map = new Map();
  for (const row of rows) {
    const key = String(row.sku || "").toLowerCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function collectMarcoImageUrls(marcoProduct) {
  const urls = [];
  const seen = new Set();
  const add = (url) => {
    if (!isHttpUrl(url)) return;
    const cleaned = url.trim();
    if (seen.has(cleaned)) return;
    seen.add(cleaned);
    urls.push(cleaned);
  };
  for (const item of normalizeMediaList(marcoProduct?.media || [])) {
    add(item.url);
  }
  for (const v of marcoProduct?.variants || []) {
    add(v.imageUrl);
  }
  for (const t of marcoProduct?.translations || []) {
    const text =
      typeof t.description === "string"
        ? t.description
        : typeof t.descriptionHtml === "string"
          ? t.descriptionHtml
          : JSON.stringify(t.description || "");
    const re = /https?:\/\/[^\s"'<>\\]+/gi;
    let m;
    while ((m = re.exec(text)) !== null) {
      add(m[0].replace(/[),.;]+$/g, ""));
    }
  }

  // Prefer hosts that are not hotlink-protected marco.am.
  urls.sort((a, b) => {
    const aMarco = /marco\.am$/i.test(new URL(a).host) ? 1 : 0;
    const bMarco = /marco\.am$/i.test(new URL(b).host) ? 1 : 0;
    return aMarco - bMarco;
  });
  return urls;
}

async function listExistingR2Gallery(r2, marcoProductId) {
  const prefix = `${R2_KEY_PREFIX}/${marcoProductId}/`;
  const out = await r2.client.send(
    new ListObjectsV2Command({
      Bucket: r2.bucket,
      Prefix: prefix,
      MaxKeys: 100,
    }),
  );
  const keys = (out.Contents || [])
    .map((obj) => obj.Key)
    .filter((key) => key && /\/image-\d+\./i.test(key))
    .sort();
  return keys.map((key) => ({
    url: `${r2.publicUrlBase}/${key}`,
    key,
    alt: "",
  }));
}

async function uploadUrlToR2(r2, marcoProductId, index, sourceUrls) {
  const candidates = Array.isArray(sourceUrls) ? sourceUrls : [sourceUrls];
  const keyBase = `${R2_KEY_PREFIX}/${marcoProductId}/image-${padIndex(index + 1)}`;

  for (const ext of ["jpg", "png", "webp", "gif", "avif"]) {
    const key = `${keyBase}.${ext}`;
    if (await r2ObjectExists(r2, key)) {
      return {
        url: `${r2.publicUrlBase}/${key}`,
        key,
        uploaded: false,
        reused: true,
        sourceUrl: candidates[0] || null,
      };
    }
  }

  const errors = [];
  for (const sourceUrl of candidates) {
    try {
      const fetched = await fetchImage(sourceUrl);
      if (!fetched.buffer?.length) {
        errors.push({ url: sourceUrl, error: "empty image body" });
        continue;
      }
      if (!String(fetched.contentType).toLowerCase().startsWith("image/")) {
        errors.push({
          url: sourceUrl,
          error: `content-type ${fetched.contentType}`,
        });
        continue;
      }
      const ext =
        extFromContentType(fetched.contentType) ||
        extFromUrl(sourceUrl) ||
        "jpg";
      const key = `${keyBase}.${ext}`;
      const contentType = String(fetched.contentType).split(";")[0].trim();
      await r2.client.send(
        new PutObjectCommand({
          Bucket: r2.bucket,
          Key: key,
          Body: fetched.buffer,
          ContentType: contentType,
        }),
      );
      return {
        url: `${r2.publicUrlBase}/${key}`,
        key,
        uploaded: true,
        reused: false,
        sourceUrl,
        bytes: fetched.buffer.length,
        contentType,
      };
    } catch (err) {
      errors.push({ url: sourceUrl, error: err.message || String(err) });
    }
  }

  const err = new Error(
    errors.map((e) => `${e.url}: ${e.error}`).join(" | ") || "DOWNLOAD_FAILED",
  );
  err.code = "DOWNLOAD_FAILED";
  err.errors = errors;
  throw err;
}

async function updateProductMediaOnly(mobee, productId, newMedia, variants) {
  await mobee.query("BEGIN");
  try {
    const updateResult = await mobee.query(
      `
      UPDATE products
      SET media = ${jsonbArrayParam(2)},
          "updatedAt" = NOW()
      WHERE id = $1
        AND cardinality(media) = 0
        AND NOT EXISTS (
          SELECT 1 FROM product_variants v
          WHERE v."productId" = $1
            AND (
              (v."imageUrl" IS NOT NULL AND btrim(v."imageUrl") <> '')
              OR cardinality(v.media) > 0
            )
        )
      `,
      [productId, JSON.stringify(newMedia)],
    );

    if (updateResult.rowCount !== 1) {
      throw new Error("SAFE_GUARD_SKIPPED_OR_FAILED: product no longer zero-media");
    }

    const firstUrl = newMedia[0]?.url || null;
    for (const variant of variants || []) {
      await mobee.query(
        `
        UPDATE product_variants
        SET "imageUrl" = $2,
            media = ${jsonbArrayParam(3)},
            "updatedAt" = NOW()
        WHERE id = $1
          AND "productId" = $4
        `,
        [variant.id, firstUrl, JSON.stringify(newMedia), productId],
      );
    }

    await mobee.query("COMMIT");
  } catch (err) {
    await mobee.query("ROLLBACK");
    throw err;
  }
}

function pickTitle(translations) {
  return (
    (translations || []).find((t) => t.locale === "hy")?.title ||
    (translations || []).find((t) => t.locale === "en")?.title ||
    (translations || []).find((t) => t.title)?.title ||
    ""
  );
}

function pickSku(variants) {
  const withSku = (variants || []).find((v) => v.sku);
  return withSku?.sku || null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage:
  node scripts/restore-marco-images-zero-media.cjs
  node scripts/restore-marco-images-zero-media.cjs --apply
  node scripts/restore-marco-images-zero-media.cjs --apply --allow-partial`);
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
    expected: {
      total: EXPECTED_TOTAL,
      withImage: EXPECTED_WITH_IMAGE,
      withoutImage: EXPECTED_ZERO_MEDIA,
    },
    inventory: {},
    totals: {},
    targets: [],
    NO_MARCO_MATCH: [],
    NO_MARCO_IMAGE: [],
    AMBIGUOUS_MATCH: [],
    MISSING_SOURCE_RELATION: [],
    applyResults: [],
    stillMissing: [],
    validation: {},
  };

  try {
    const all = await loadAllPublishedProducts(mobee);
    const withImage = [];
    const withoutImage = [];
    for (const row of all) {
      if (productHasAnyImage(row.media, row.variants)) withImage.push(row);
      else withoutImage.push(row);
    }

    report.inventory = {
      published: all.length,
      withImage: withImage.length,
      withoutImage: withoutImage.length,
    };

    console.log("Inventory:");
    console.log(`  Published products: ${all.length}`);
    console.log(`  Already with images: ${withImage.length}`);
    console.log(`  Missing images: ${withoutImage.length}`);

    if (withoutImage.length === 0) {
      console.log("\nNothing to do: no zero-media products.");
      fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
      return;
    }

    if (withoutImage.length !== EXPECTED_ZERO_MEDIA) {
      console.warn(
        `Note: zero-media count is ${withoutImage.length} (initial expected ${EXPECTED_ZERO_MEDIA}). Continuing with current zero-media set only.`,
      );
    }

    const protectedMediaSnapshot = new Map(
      withImage.map((p) => [
        p.id,
        JSON.stringify({
          media: normalizeMediaList(p.media),
          variants: (p.variants || []).map((v) => ({
            id: v.id,
            imageUrl: v.imageUrl,
            media: normalizeMediaList(v.media),
          })),
        }),
      ]),
    );

    // Match targets to Marco
    const allSourcePids = [];
    for (const p of withoutImage) {
      for (const v of p.variants || []) {
        if (v.source === SOURCE_NAME && v.sourcePid) allSourcePids.push(v.sourcePid);
      }
    }
    const variantToProduct = await resolveMarcoProductIdsFromVariants(
      marco,
      allSourcePids,
    );

    const skuList = withoutImage.map((p) => pickSku(p.variants)).filter(Boolean);
    const skuMap = await loadMarcoProductsBySkus(marco, skuList);

    const candidateMarcoIds = new Set();
    const plans = [];

    for (const product of withoutImage) {
      const title = pickTitle(product.translations);
      const sku = pickSku(product.variants);
      const sourcePids = (product.variants || [])
        .filter((v) => v.source === SOURCE_NAME && v.sourcePid)
        .map((v) => String(v.sourcePid));
      const uniqueSourcePids = [...new Set(sourcePids)];

      let matchType = null;
      let marcoProductId = null;
      let reason = null;
      const marcoIdCandidates = new Set();

      // 1) sourcePid default pattern
      const fromDefault = resolveMarcoProductIdFromSourcePids(uniqueSourcePids);
      if (fromDefault) {
        marcoIdCandidates.add(fromDefault);
        matchType = "SOURCE_PID_DEFAULT";
      }

      // 2) source variant id → Marco product
      for (const pid of uniqueSourcePids) {
        if (variantToProduct.has(pid)) {
          marcoIdCandidates.add(variantToProduct.get(pid));
          matchType = matchType || "SOURCE_VARIANT_ID";
        }
      }

      // 3) exact SKU (only if no source identity)
      if (marcoIdCandidates.size === 0 && sku) {
        const hits = skuMap.get(String(sku).toLowerCase()) || [];
        const productIds = [...new Set(hits.map((h) => h.productId))];
        if (productIds.length === 1 && Number(hits[0].sku_hit_count) === 1) {
          marcoIdCandidates.add(productIds[0]);
          matchType = "EXACT_SKU";
        } else if (productIds.length > 1 || Number(hits[0]?.sku_hit_count || 0) > 1) {
          reason = "AMBIGUOUS_MATCH";
        }
      }

      if (marcoIdCandidates.size > 1) {
        reason = "AMBIGUOUS_MATCH";
        marcoProductId = null;
      } else if (marcoIdCandidates.size === 1) {
        marcoProductId = [...marcoIdCandidates][0];
      } else if (!reason) {
        reason = uniqueSourcePids.length === 0 ? "MISSING_SOURCE_RELATION" : "NO_MARCO_MATCH";
      }

      if (marcoProductId) candidateMarcoIds.add(marcoProductId);

      plans.push({
        productId: product.id,
        title,
        sku,
        brand: product.brand_name || product.brand_slug || "",
        category: product.category_title || "",
        sourcePids: uniqueSourcePids,
        marcoSourceProductId: fromDefault || uniqueSourcePids[0] || null,
        currentMediaCount: normalizeMediaList(product.media).length,
        matchType,
        marcoProductId,
        reason,
        variants: product.variants || [],
        preSnapshot: snapshotNonMediaFields(product),
        marcoImageUrls: [],
      });
    }

    const marcoMap = await loadMarcoProductsByIds(marco, [...candidateMarcoIds]);

    for (const plan of plans) {
      if (!plan.marcoProductId) continue;
      const marcoProduct = marcoMap.get(plan.marcoProductId) || null;
      if (!marcoProduct) {
        plan.reason = "NO_MARCO_MATCH";
        plan.marcoProductId = null;
        continue;
      }
      const urls = collectMarcoImageUrls(marcoProduct);
      const existingR2 = await listExistingR2Gallery(r2, plan.marcoProductId);
      plan.marcoImageUrls = urls;
      plan.existingR2Gallery = existingR2;
      plan.matchedMarcoTitle =
        (marcoProduct.translations || []).find((t) => t.title)?.title || null;
      if (urls.length === 0 && existingR2.length === 0) {
        plan.reason = "NO_MARCO_IMAGE";
      } else {
        plan.reason = null;
        plan.status = "READY";
      }
    }

    const ready = plans.filter((p) => p.status === "READY");
    const noMatch = plans.filter((p) => p.reason === "NO_MARCO_MATCH");
    const noImage = plans.filter((p) => p.reason === "NO_MARCO_IMAGE");
    const ambiguous = plans.filter((p) => p.reason === "AMBIGUOUS_MATCH");
    const missingSource = plans.filter((p) => p.reason === "MISSING_SOURCE_RELATION");

    report.totals = {
      published: all.length,
      alreadyWithImages: withImage.length,
      missingImages: withoutImage.length,
      targetsWithExactMarcoMatch: plans.filter((p) => p.marcoProductId).length,
      targetsWithMarcoImageAvailable: ready.length,
      targetsWithoutMarcoImage: noImage.length,
      ambiguousMatches: ambiguous.length,
      missingMarcoSourceRelation: missingSource.length,
      noMarcoMatch: noMatch.length,
    };

    report.targets = plans.map((p) => ({
      productId: p.productId,
      title: p.title,
      sku: p.sku,
      brand: p.brand,
      category: p.category,
      marcoSourceProductId: p.marcoSourceProductId,
      currentMediaCount: p.currentMediaCount,
      matchedMarcoProductId: p.marcoProductId,
      matchedMarcoTitle: p.matchedMarcoTitle || null,
      matchType: p.matchType,
      marcoImageUrls: p.marcoImageUrls,
      reason: p.reason,
      status: p.status || p.reason || "UNKNOWN",
    }));

    report.NO_MARCO_MATCH = noMatch.map((p) => p.productId);
    report.NO_MARCO_IMAGE = noImage.map((p) => ({
      productId: p.productId,
      title: p.title,
      marcoProductId: p.marcoProductId,
    }));
    report.AMBIGUOUS_MATCH = ambiguous.map((p) => ({
      productId: p.productId,
      title: p.title,
      sku: p.sku,
    }));
    report.MISSING_SOURCE_RELATION = missingSource.map((p) => ({
      productId: p.productId,
      title: p.title,
      sku: p.sku,
    }));

    console.log("\nDry-run summary:");
    console.log(`  Published products: ${report.totals.published}`);
    console.log(`  Already with images: ${report.totals.alreadyWithImages}`);
    console.log(`  Missing images: ${report.totals.missingImages}`);
    console.log(`  Targets with exact Marco match: ${report.totals.targetsWithExactMarcoMatch}`);
    console.log(`  Targets with Marco image available: ${report.totals.targetsWithMarcoImageAvailable}`);
    console.log(`  Targets without Marco image: ${report.totals.targetsWithoutMarcoImage}`);
    console.log(`  Ambiguous matches: ${report.totals.ambiguousMatches}`);
    console.log(`  Missing Marco source relation: ${report.totals.missingMarcoSourceRelation}`);
    console.log(`  No Marco match: ${report.totals.noMarcoMatch}`);

    if (ambiguous.length > 0) {
      console.log("\nAMBIGUOUS_MATCH products will NOT be written:");
      for (const p of ambiguous) {
        console.log(`  - ${p.productId} | ${p.title} | ${p.sku}`);
      }
    }

    if (!args.apply) {
      fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
      console.log(`\nDry-run report written: ${REPORT_PATH}`);
      console.log("Re-run with --apply to persist R2 + DB media for READY targets.");
      return;
    }

    // APPLY
    console.log(`\nApplying media for ${ready.length} READY targets...`);
    const applyResults = await mapPool(ready, args.concurrency, async (plan) => {
      const result = {
        productId: plan.productId,
        title: plan.title,
        sku: plan.sku,
        brand: plan.brand,
        category: plan.category,
        marcoProductId: plan.marcoProductId,
        status: "PENDING",
        reason: null,
        uploadedUrls: [],
        errors: [],
      };

      try {
        const newMedia = [];
        const existingR2 = plan.existingR2Gallery || [];
        const sourceUrls = plan.marcoImageUrls || [];
        const slotCount = Math.max(existingR2.length, sourceUrls.length, 1);

        for (let i = 0; i < slotCount; i += 1) {
          const candidates = [];
          if (existingR2[i]?.url) candidates.push(existingR2[i].url);
          // Prefer non-marco hosts first (already sorted), then all sources for this slot.
          if (sourceUrls[i]) candidates.push(sourceUrls[i]);
          for (const url of sourceUrls) {
            if (!candidates.includes(url)) candidates.push(url);
          }

          try {
            const uploaded = await uploadUrlToR2(
              r2,
              plan.marcoProductId,
              i,
              candidates,
            );
            const head = await headOk(uploaded.url);
            if (!head.ok) {
              throw new Error(`R2_HEAD_FAILED status=${head.statusCode}`);
            }
            newMedia.push({
              url: uploaded.url,
              alt: plan.title || "",
            });
            result.uploadedUrls.push({
              ...uploaded,
              headStatus: head.statusCode,
            });
          } catch (err) {
            const message = err.message || String(err);
            result.errors.push({
              index: i,
              error: message,
              details: err.errors || undefined,
            });
            if (/HTTP /i.test(message) || /timeout/i.test(message) || /empty/i.test(message) || err.code === "DOWNLOAD_FAILED") {
              result.reason = "DOWNLOAD_FAILED";
            } else if (/R2_/i.test(message) || /PutObject/i.test(message)) {
              result.reason = "R2_UPLOAD_FAILED";
            } else {
              result.reason = "OTHER";
            }
            // Keep going: write whatever images we can recover.
            continue;
          }
        }

        if (newMedia.length === 0) {
          result.status = "FAILED";
          result.reason = result.reason || "NO_MARCO_IMAGE";
          return result;
        }

        await updateProductMediaOnly(mobee, plan.productId, newMedia, plan.variants);

        // Verify non-media snapshot
        const after = await loadProductSnapshotById(mobee, plan.productId);
        if (!after) {
          throw new Error("Product missing after update");
        }
        const afterSnap = snapshotNonMediaFields(after);
        if (JSON.stringify(afterSnap) !== JSON.stringify(plan.preSnapshot)) {
          result.status = "FAILED";
          result.reason = "NON_MEDIA_FIELD_DRIFT";
          result.errors.push({
            error: "Non-media fields changed after media update",
          });
          return result;
        }

        result.status = "OK";
        result.mediaCount = newMedia.length;
        return result;
      } catch (err) {
        result.status = "FAILED";
        result.reason = result.reason || "OTHER";
        result.errors.push({ error: err.message || String(err) });
        return result;
      }
    });

    report.applyResults = applyResults;

    // Post validation
    const afterAll = await loadAllPublishedProducts(mobee);
    const afterWith = [];
    const afterWithout = [];
    for (const row of afterAll) {
      if (productHasAnyImage(row.media, row.variants)) afterWith.push(row);
      else afterWithout.push(row);
    }

    let protectedModified = 0;
    for (const p of afterWith) {
      const before = protectedMediaSnapshot.get(p.id);
      if (!before) continue;
      const afterMedia = JSON.stringify({
        media: normalizeMediaList(p.media),
        variants: (p.variants || []).map((v) => ({
          id: v.id,
          imageUrl: v.imageUrl,
          media: normalizeMediaList(v.media),
        })),
      });
      if (afterMedia !== before) protectedModified += 1;
    }

    const okCount = applyResults.filter((r) => r.status === "OK").length;
    const failedCount = applyResults.filter((r) => r.status === "FAILED").length;

    const stillMissing = afterWithout.map((p) => {
      const plan = plans.find((x) => x.productId === p.id);
      const apply = applyResults.find((x) => x.productId === p.id);
      return {
        brand: plan?.brand || p.brand_name || "",
        category: plan?.category || p.category_title || "",
        title: plan?.title || pickTitle(p.translations),
        sku: plan?.sku || pickSku(p.variants),
        marcoProductId: plan?.marcoProductId || null,
        reason:
          apply?.reason ||
          plan?.reason ||
          (plan?.status === "READY" ? "OTHER" : plan?.reason) ||
          "OTHER",
      };
    });

    report.stillMissing = stillMissing;
    report.validation = {
      before: {
        total: all.length,
        withImage: withImage.length,
        withoutImage: withoutImage.length,
      },
      apply: {
        targeted: withoutImage.length,
        readyAttempted: ready.length,
        imagesSuccessfullyRestored: okCount,
        failedOrNoSourceImage: withoutImage.length - okCount,
        errors: failedCount,
      },
      after: {
        total: afterAll.length,
        withImage: afterWith.length,
        withoutImage: afterWithout.length,
      },
      existing188MediaModified: protectedModified,
      productsOutsideTargetModified: protectedModified,
      brokenR2ImageUrls: applyResults.reduce(
        (n, r) =>
          n +
          (r.uploadedUrls || []).filter((u) => u.headStatus && u.headStatus >= 400)
            .length,
        0,
      ),
    };

    console.log("\nPost-apply:");
    console.log(`  Restored OK: ${okCount}`);
    console.log(`  Failed: ${failedCount}`);
    console.log(`  After with image: ${afterWith.length}`);
    console.log(`  After without image: ${afterWithout.length}`);
    console.log(`  Existing 188 media modified: ${protectedModified}`);
    console.log("\nStill missing:");
    for (const row of stillMissing) {
      console.log(
        `  ${row.brand} | ${row.category} | ${row.title} | ${row.sku} | ${row.marcoProductId} | ${row.reason}`,
      );
    }

    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(`\nReport: ${REPORT_PATH}`);
  } finally {
    await mobee.end().catch(() => undefined);
    await marco.end().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
