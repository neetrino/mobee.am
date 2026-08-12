"use strict";

/**
 * Strip Marco-hosted media from Mobee products (MEDIA-ONLY).
 *
 * Removes URLs under:
 *   - /products/marco/
 *   - /products/imported/marco/
 *   - marco.am hosts
 *
 * Keeps official / non-Marco media untouched.
 *
 * Usage:
 *   node scripts/strip-marco-product-images.cjs
 *   node scripts/strip-marco-product-images.cjs --apply
 */

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const REPORT_PATH = path.join(
  process.cwd(),
  "scripts",
  "strip-marco-product-images.dry-run.json",
);

const MARCO_PATH_RE = /\/products\/(?:imported\/)?marco\//i;
const MARCO_HOST_RE = /(^|\.)marco\.am$/i;

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
  const args = { apply: false, help: false };
  for (const raw of argv) {
    if (raw === "--apply") args.apply = true;
    else if (raw === "--help" || raw === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${raw}`);
  }
  return args;
}

function isMarcoUrl(url) {
  if (typeof url !== "string" || !url.trim()) return false;
  const trimmed = url.trim();
  if (MARCO_PATH_RE.test(trimmed)) return true;
  try {
    return MARCO_HOST_RE.test(new URL(trimmed).hostname);
  } catch {
    return false;
  }
}

function extractUrl(item) {
  if (typeof item === "string") return item.trim() || null;
  if (item && typeof item === "object") {
    for (const key of ["url", "src", "value"]) {
      const value = item[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return null;
}

function filterMediaArray(media) {
  if (!Array.isArray(media)) return { kept: [], removed: 0, hadMarco: false };
  const kept = [];
  let removed = 0;
  let hadMarco = false;
  for (const item of media) {
    const url = extractUrl(item);
    if (url && isMarcoUrl(url)) {
      removed += 1;
      hadMarco = true;
      continue;
    }
    if (url) kept.push(typeof item === "string" ? url : item);
  }
  return { kept, removed, hadMarco };
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage:
  node scripts/strip-marco-product-images.cjs
  node scripts/strip-marco-product-images.cjs --apply`);
    return;
  }

  const env = loadEnv(path.join(process.cwd(), ".env"));
  if (!env.DIRECT_URL) throw new Error("Missing DIRECT_URL");

  const client = new Client({
    connectionString: env.DIRECT_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const report = {
    mode: args.apply ? "APPLY" : "DRY_RUN",
    generatedAt: new Date().toISOString(),
    productsTouched: [],
    totals: {
      productsScanned: 0,
      productsWithMarcoMedia: 0,
      productsClearedFully: 0,
      productsPartialStrip: 0,
      mediaItemsRemoved: 0,
    },
  };

  try {
    const { rows: products } = await client.query(`
      SELECT
        p.id,
        p.media,
        p.published,
        (
          SELECT json_agg(json_build_object(
            'id', v.id,
            'imageUrl', v."imageUrl",
            'media', to_jsonb(v.media)
          ) ORDER BY v.position, v.id)
          FROM product_variants v
          WHERE v."productId" = p.id
        ) AS variants,
        (
          SELECT t.title
          FROM product_translations t
          WHERE t."productId" = p.id
          ORDER BY CASE t.locale WHEN 'hy' THEN 1 WHEN 'en' THEN 2 ELSE 3 END
          LIMIT 1
        ) AS title
      FROM products p
      WHERE p."deletedAt" IS NULL
      ORDER BY p.id
    `);

    report.totals.productsScanned = products.length;

    const plans = [];
    for (const product of products) {
      const productMedia = filterMediaArray(product.media);
      let variantHadMarco = false;
      let variantRemoved = 0;
      const variantPlans = [];

      for (const variant of product.variants || []) {
        const variantMedia = filterMediaArray(variant.media);
        const imageIsMarco = isMarcoUrl(variant.imageUrl);
        if (variantMedia.hadMarco || imageIsMarco) {
          variantHadMarco = true;
        }
        if (imageIsMarco) variantRemoved += 1;
        variantRemoved += variantMedia.removed;
        variantPlans.push({
          id: variant.id,
          imageUrl: imageIsMarco ? null : variant.imageUrl || null,
          media: variantMedia.kept,
          changed:
            imageIsMarco ||
            variantMedia.removed > 0 ||
            (Array.isArray(variant.media) &&
              variantMedia.kept.length !== variant.media.length),
        });
      }

      const productChanged =
        productMedia.hadMarco ||
        productMedia.removed > 0 ||
        variantPlans.some((v) => v.changed);

      if (!productChanged && !variantHadMarco) {
        continue;
      }

      const nextProductMedia = productMedia.kept;
      const clearedFully =
        nextProductMedia.length === 0 &&
        variantPlans.every(
          (v) =>
            !v.imageUrl &&
            (!Array.isArray(v.media) || v.media.length === 0),
        );

      plans.push({
        id: product.id,
        title: product.title || "",
        published: product.published,
        beforeMediaCount: Array.isArray(product.media) ? product.media.length : 0,
        afterMediaCount: nextProductMedia.length,
        removedCount: productMedia.removed + variantRemoved,
        clearedFully,
        media: nextProductMedia,
        variants: variantPlans,
      });
    }

    report.totals.productsWithMarcoMedia = plans.length;
    report.totals.productsClearedFully = plans.filter((p) => p.clearedFully).length;
    report.totals.productsPartialStrip = plans.filter((p) => !p.clearedFully).length;
    report.totals.mediaItemsRemoved = plans.reduce((n, p) => n + p.removedCount, 0);
    report.productsTouched = plans.map((p) => ({
      id: p.id,
      title: p.title,
      beforeMediaCount: p.beforeMediaCount,
      afterMediaCount: p.afterMediaCount,
      removedCount: p.removedCount,
      clearedFully: p.clearedFully,
    }));

    console.log("Strip Marco images:");
    console.log(`  Products scanned: ${report.totals.productsScanned}`);
    console.log(`  Products with Marco media: ${report.totals.productsWithMarcoMedia}`);
    console.log(`  Will clear fully (no media left): ${report.totals.productsClearedFully}`);
    console.log(`  Partial strip (kept non-Marco): ${report.totals.productsPartialStrip}`);
    console.log(`  Media items removed: ${report.totals.mediaItemsRemoved}`);

    if (!args.apply) {
      fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
      console.log(`\nDry-run report: ${REPORT_PATH}`);
      console.log("Re-run with --apply to write.");
      return;
    }

    await client.query("BEGIN");
    try {
      for (const plan of plans) {
        await client.query(
          `
          UPDATE products
          SET media = ${jsonbArrayParam(2)},
              "updatedAt" = NOW()
          WHERE id = $1
          `,
          [plan.id, JSON.stringify(plan.media)],
        );

        for (const variant of plan.variants) {
          if (!variant.changed) continue;
          await client.query(
            `
            UPDATE product_variants
            SET "imageUrl" = $2,
                media = ${jsonbArrayParam(3)},
                "updatedAt" = NOW()
            WHERE id = $1
            `,
            [variant.id, variant.imageUrl, JSON.stringify(variant.media)],
          );
        }
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }

    // Post counts
    const { rows: after } = await client.query(`
      SELECT
        p.id,
        p.media,
        (
          SELECT json_agg(json_build_object(
            'imageUrl', v."imageUrl",
            'media', to_jsonb(v.media)
          ))
          FROM product_variants v
          WHERE v."productId" = p.id
        ) AS variants
      FROM products p
      WHERE p."deletedAt" IS NULL
        AND p.published = true
    `);

    let withImage = 0;
    let withoutImage = 0;
    let stillMarco = 0;
    for (const row of after) {
      const urls = [];
      const push = (u) => {
        if (typeof u === "string" && u.trim()) urls.push(u.trim());
      };
      if (Array.isArray(row.media)) {
        for (const item of row.media) push(extractUrl(item));
      }
      for (const v of row.variants || []) {
        push(v.imageUrl);
        if (Array.isArray(v.media)) {
          for (const item of v.media) push(extractUrl(item));
        }
      }
      if (urls.length === 0) withoutImage += 1;
      else withImage += 1;
      if (urls.some(isMarcoUrl)) stillMarco += 1;
    }

    report.validation = {
      published: after.length,
      withImage,
      withoutImage,
      stillWithMarcoMedia: stillMarco,
    };

    console.log("\nAfter apply:");
    console.log(`  Published: ${after.length}`);
    console.log(`  With image: ${withImage}`);
    console.log(`  Without image: ${withoutImage}`);
    console.log(`  Still with Marco media: ${stillMarco}`);

    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(`\nReport: ${REPORT_PATH}`);
  } finally {
    await client.end().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
