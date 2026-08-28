"use strict";

const { SOURCE_NAME } = require("./copy-descriptions-lib.cjs");

async function loadMobeeMarcoProducts(mobee, productId) {
  const params = [SOURCE_NAME];
  let extra = "";
  if (productId) {
    params.push(productId);
    extra = `AND p.id = $${params.length}`;
  }
  const { rows } = await mobee.query(
    `
    SELECT
      p.id,
      p.published,
      (
        SELECT json_agg(json_build_object(
          'id', t.id,
          'locale', t.locale,
          'slug', t.slug,
          'title', t.title,
          'descriptionHtml', t."descriptionHtml"
        ) ORDER BY t.locale)
        FROM product_translations t
        WHERE t."productId" = p.id
      ) AS translations,
      (
        SELECT json_agg(v."sourcePid" ORDER BY v.position, v.id)
        FROM product_variants v
        WHERE v."productId" = p.id
          AND v.source = $1
          AND v."sourcePid" IS NOT NULL
      ) AS source_pids
    FROM products p
    WHERE p."deletedAt" IS NULL
      AND EXISTS (
        SELECT 1 FROM product_variants v
        WHERE v."productId" = p.id
          AND v.source = $1
          AND v."sourcePid" IS NOT NULL
      )
      ${extra}
    ORDER BY p.id
    `,
    params
  );
  return rows;
}

async function resolveMarcoProductIdsFromVariants(marco, sourcePids) {
  const plain = sourcePids.filter(
    (pid) => pid && !String(pid).startsWith("marco-product-")
  );
  if (!plain.length) return new Map();
  const { rows } = await marco.query(
    `SELECT id, "productId" FROM product_variants WHERE id = ANY($1::text[])`,
    [plain]
  );
  return new Map(rows.map((r) => [r.id, r.productId]));
}

async function loadMarcoTranslations(marco, productIds) {
  if (!productIds.length) return new Map();
  const { rows } = await marco.query(
    `
    SELECT
      p.id,
      (
        SELECT json_agg(json_build_object(
          'locale', t.locale,
          'title', t.title,
          'description', t.description
        ) ORDER BY t.locale)
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

module.exports = {
  loadMobeeMarcoProducts,
  resolveMarcoProductIdsFromVariants,
  loadMarcoTranslations,
};
