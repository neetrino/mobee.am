"use strict";

/**
 * Copy official R2 images from donor Marco products to target products.
 * Deterministic keys: products/official/<brand>/<target-model>/image-NN.<ext>
 */

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const {
  fetchImage,
  headRequest,
} = require("./lib/official-images/http.utils.cjs");
const {
  resolveMime,
} = require("./lib/official-images/image-format.utils.cjs");
const {
  normalizeModelKey,
} = require("./lib/official-images/model.utils.cjs");

const SOURCE_NAME = "marco";
const BACKUP_DIR = path.join(process.cwd(), "tmp", "official-images-backups");

/** @type {{ targetTitleIncludes: string, donorTitleIncludes: string, brand: string, targetModel: string }[]} */
const COPIES = [
  {
    targetTitleIncludes: "F12M7HDS1",
    donorTitleIncludes: "F-4J3TS2W",
    brand: "lg",
    targetModel: "f12m7hds1",
  },
  {
    targetTitleIncludes: "6010",
    donorTitleIncludes: "WF3S9043BW4",
    brand: "hisense",
    targetModel: "6010",
    targetTitleExactish: true,
  },
  {
    targetTitleIncludes: "WFSQ8012VMT",
    donorTitleIncludes: "WF3S1043BB3",
    brand: "hisense",
    targetModel: "wfsq8012vmt",
  },
  {
    targetTitleIncludes: "WFQP9014T",
    donorTitleIncludes: "WF3S1043BB3",
    brand: "hisense",
    targetModel: "wfqp9014t",
  },
  {
    targetTitleIncludes: "WFQA1014EVJMWT",
    donorTitleIncludes: "WF5S1043BB",
    brand: "hisense",
    targetModel: "wfqa1014evjmwt",
  },
  {
    targetTitleIncludes: "WFQP6012EVMT",
    donorTitleIncludes: "WF3S1043BB3",
    brand: "hisense",
    targetModel: "wfqp6012evmt",
  },
  {
    targetTitleIncludes: "WFQP7012EVMT",
    donorTitleIncludes: "WF3S1043BB3",
    brand: "hisense",
    targetModel: "wfqp7012evmt",
  },
  {
    targetTitleIncludes: "F1M7NDS1",
    donorTitleIncludes: "F2V3GS4W",
    brand: "lg",
    targetModel: "f1m7nds1",
  },
  {
    targetTitleIncludes: "F2G3NSOW",
    donorTitleIncludes: "F2V3GS4W",
    brand: "lg",
    targetModel: "f2g3nsow",
  },
  {
    targetTitleIncludes: "F2T9FW9P",
    donorTitleIncludes: "F2V3GS4W",
    brand: "lg",
    targetModel: "f2t9fw9p",
  },
];

function loadEnv() {
  const out = {};
  for (const line of fs
    .readFileSync(path.join(process.cwd(), ".env"), "utf8")
    .split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[t.slice(0, i).trim()] = v;
  }
  return out;
}

function createR2(env) {
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
    publicUrlBase: String(publicUrl).replace(/\/+$/, ""),
  };
}

function collectUrls(media) {
  if (!media) return [];
  if (typeof media === "string") {
    try {
      return collectUrls(JSON.parse(media));
    } catch {
      return media.startsWith("http") ? [media] : [];
    }
  }
  if (Array.isArray(media)) return media.flatMap((x) => collectUrls(x));
  if (typeof media === "object" && typeof media.url === "string") {
    return [media.url];
  }
  return [];
}

function normalizeMediaList(media) {
  const urls = collectUrls(media);
  return urls.map((url) => ({ url }));
}

function padIndex(n) {
  return String(n).padStart(2, "0");
}

/** products.media / variant.media are jsonb[] in this schema. */
function jsonbArrayParam(paramIndex) {
  return `COALESCE(
    (
      SELECT array_agg(elem)
      FROM jsonb_array_elements($${paramIndex}::jsonb) AS elem
    ),
    ARRAY[]::jsonb[]
  )`;
}

function titleMatches(title, needle, exactish) {
  const t = String(title || "");
  if (exactish && needle === "6010") {
    // Avoid matching WFVC6010T etc. — title should contain bare 6010 as model.
    return (
      /\b6010\b/i.test(t) &&
      !/WFVC6010|WFQP6010|WF[A-Z0-9]*6010/i.test(t.replace(/\b6010\b/i, "X"))
    ) || (/HISENS?\s+6010\b/i.test(t) || /\b6010\b/i.test(t) && !/WF/i.test(t));
  }
  return new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(t);
}

async function streamToBuffer(body) {
  if (!body) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  const chunks = [];
  for await (const chunk of body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function downloadOfficial(r2, url) {
  try {
    const u = new URL(url);
    if (url.includes("/products/official/")) {
      const key = u.pathname.replace(/^\//, "");
      const got = await r2.client.send(
        new GetObjectCommand({ Bucket: r2.bucket, Key: key })
      );
      const buffer = await streamToBuffer(got.Body);
      const mimeInfo = resolveMime(got.ContentType, buffer);
      return {
        buffer,
        contentType: mimeInfo.mime || got.ContentType || "image/jpeg",
        ext: mimeInfo.ext || "jpg",
      };
    }
  } catch {
    /* fall through to HTTP */
  }
  const got = await fetchImage(url);
  if (got.statusCode !== 200) {
    throw new Error(`Fetch failed ${url}: HTTP ${got.statusCode}`);
  }
  const mimeInfo = resolveMime(got.contentType, got.buffer);
  if (!mimeInfo.mime) throw new Error(`Not image: ${url}`);
  return {
    buffer: got.buffer,
    contentType: mimeInfo.mime,
    ext: mimeInfo.ext || "jpg",
  };
}

(async () => {
  const apply = process.argv.includes("--apply");
  const env = loadEnv();
  const db = new Client({
    connectionString: env.DIRECT_URL,
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();
  const r2 = createR2(env);

  const { rows } = await db.query(`
    SELECT p.id, p.media, p."brandId", p.published,
      (SELECT pt.title FROM product_translations pt
       WHERE pt."productId" = p.id
       ORDER BY CASE pt.locale WHEN 'en' THEN 0 ELSE 1 END LIMIT 1) AS title
    FROM products p
    WHERE EXISTS (
      SELECT 1 FROM product_variants v
      WHERE v."productId" = p.id AND v.source = $1
    )
  `, [SOURCE_NAME]);

  function findProduct(needle, exactish) {
    const hits = rows.filter((r) => titleMatches(r.title, needle, exactish));
    if (hits.length === 0) return null;
    if (hits.length > 1 && exactish) {
      const bare = hits.find((r) => /\b6010\b/i.test(r.title) && !/WF/i.test(r.title));
      if (bare) return bare;
    }
    if (hits.length > 1) {
      // Prefer exact compact model token
      const compact = needle.replace(/-/g, "").toUpperCase();
      const better = hits.find((r) =>
        String(r.title).toUpperCase().replace(/[^A-Z0-9]/g, "").includes(compact)
      );
      if (better) return better;
    }
    return hits[0];
  }

  console.log(`Mode: ${apply ? "APPLY" : "DRY_RUN"}`);
  console.log("| Target | Donor | Donor images | Action |");
  console.log("|---|---|---:|---|");

  const results = [];
  for (const copy of COPIES) {
    const target = findProduct(copy.targetTitleIncludes, copy.targetTitleExactish);
    const donor = findProduct(copy.donorTitleIncludes, false);
    if (!target) {
      results.push({ copy, error: "TARGET_NOT_FOUND" });
      console.log(`| ${copy.targetTitleIncludes} | ${copy.donorTitleIncludes} | - | TARGET_NOT_FOUND |`);
      continue;
    }
    if (!donor) {
      results.push({ copy, error: "DONOR_NOT_FOUND", target });
      console.log(`| ${target.title} | ${copy.donorTitleIncludes} | - | DONOR_NOT_FOUND |`);
      continue;
    }
    const donorUrls = collectUrls(donor.media).filter((u) =>
      String(u).includes("/products/official/")
    );
    if (!donorUrls.length) {
      results.push({ copy, error: "DONOR_NO_OFFICIAL", target, donor });
      console.log(`| ${target.title} | ${donor.title} | 0 | DONOR_NO_OFFICIAL |`);
      continue;
    }

    const modelPath = normalizeModelKey(copy.targetModel);
    const planned = [];
    for (let i = 0; i < donorUrls.length; i += 1) {
      planned.push({
        sourceUrl: donorUrls[i],
        index: i + 1,
        modelPath,
      });
    }

    console.log(
      `| ${target.title} | ${donor.title} | ${donorUrls.length} | ${apply ? "APPLY" : "READY_TO_COPY"} |`
    );

    if (!apply) {
      results.push({
        ok: true,
        dryRun: true,
        targetId: target.id,
        targetTitle: target.title,
        donorId: donor.id,
        donorTitle: donor.title,
        imageCount: donorUrls.length,
        plannedKeys: planned.map(
          (p) => `products/official/${copy.brand}/${p.modelPath}/image-${padIndex(p.index)}.?`
        ),
      });
      continue;
    }

    const uploaded = [];
    for (const item of planned) {
      const bin = await downloadOfficial(r2, item.sourceUrl);
      const key = `products/official/${copy.brand}/${item.modelPath}/image-${padIndex(item.index)}.${bin.ext}`;
      await r2.client.send(
        new PutObjectCommand({
          Bucket: r2.bucket,
          Key: key,
          Body: bin.buffer,
          ContentType: bin.contentType,
          CacheControl: "public, max-age=31536000, immutable",
        })
      );
      uploaded.push({
        key,
        publicUrl: `${r2.publicUrlBase}/${key}`,
        contentType: bin.contentType,
      });
    }

    const verify = [];
    for (const u of uploaded) {
      const head = await headRequest(u.publicUrl);
      verify.push({
        url: u.publicUrl,
        ok: head.ok || head.statusCode === 200,
        statusCode: head.statusCode,
      });
    }
    if (verify.some((v) => !v.ok)) {
      results.push({
        ok: false,
        error: "R2_VERIFY_FAILED",
        targetId: target.id,
        verify,
      });
      console.log(`  VERIFY_FAILED ${target.title}`);
      continue;
    }

    const variantsBefore = await db.query(
      `
      SELECT id, sku, price, stock, "imageUrl", media, source
      FROM product_variants
      WHERE "productId" = $1 AND source = $2
      `,
      [target.id, SOURCE_NAME]
    );
    const productBefore = await db.query(
      `SELECT id, media, "brandId", published FROM products WHERE id = $1`,
      [target.id]
    );
    const translationsBefore = await db.query(
      `
      SELECT id, locale, title, subtitle, "descriptionHtml", slug
      FROM product_translations WHERE "productId" = $1 ORDER BY locale
      `,
      [target.id]
    ).catch(() => ({ rows: [] }));

    const alt = target.title || copy.targetModel;
    const newMedia = uploaded.map((u) => ({ url: u.publicUrl, alt }));
    const oldMedia = normalizeMediaList(target.media);

    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const backupPath = path.join(
      BACKUP_DIR,
      `backup-copy-${target.id}-${Date.now()}.json`
    );
    fs.writeFileSync(
      backupPath,
      JSON.stringify(
        {
          productId: target.id,
          title: target.title,
          donorId: donor.id,
          donorTitle: donor.title,
          backedUpAt: new Date().toISOString(),
          product: productBefore.rows[0] || null,
          variants: variantsBefore.rows,
          translations: translationsBefore.rows,
          oldMedia,
          newMedia,
        },
        null,
        2
      )
    );

    await db.query("BEGIN");
    try {
      await db.query(
        `
        UPDATE products
        SET media = ${jsonbArrayParam(2)}, "updatedAt" = NOW()
        WHERE id = $1
        `,
        [target.id, JSON.stringify(newMedia)]
      );
      for (const variant of variantsBefore.rows) {
        await db.query(
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
      await db.query("COMMIT");
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    }

    results.push({
      ok: true,
      targetId: target.id,
      targetTitle: target.title,
      donorTitle: donor.title,
      uploaded: uploaded.length,
      backupPath,
      verify,
    });
  }

  // Coverage
  const after = await db.query(`
    SELECT p.id, p.media,
      (SELECT pt.title FROM product_translations pt
       WHERE pt."productId" = p.id
       ORDER BY CASE pt.locale WHEN 'en' THEN 0 ELSE 1 END LIMIT 1) AS title
    FROM products p
    WHERE EXISTS (
      SELECT 1 FROM product_variants v
      WHERE v."productId" = p.id AND v.source = $1
    )
  `, [SOURCE_NAME]);

  let withOfficial = 0;
  let stillMarco = 0;
  for (const r of after.rows) {
    const urls = collectUrls(r.media);
    if (urls.some((u) => String(u).includes("/products/official/"))) withOfficial += 1;
    else stillMarco += 1;
  }

  console.log("\n## Summary");
  console.log(
    JSON.stringify(
      {
        mode: apply ? "APPLY" : "DRY_RUN",
        planned: COPIES.length,
        ok: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok && r.error).length,
        productsApplied: apply ? results.filter((r) => r.ok && !r.dryRun).length : 0,
        imagesUploaded: apply
          ? results.reduce((n, r) => n + (r.uploaded || 0), 0)
          : 0,
        officialProductsTotal: withOfficial,
        stillMarco,
        dbFieldsChangedBesidesMedia: 0,
      },
      null,
      2
    )
  );

  if (!apply) {
    console.log("\nDry-run only. Re-run with --apply to write.");
  }

  await db.end();
  if (results.some((r) => r.error)) process.exitCode = 1;
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
